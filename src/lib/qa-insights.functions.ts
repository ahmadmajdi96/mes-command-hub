import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "openai/gpt-6-astra";

export const summarizeDeviations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ recipeId: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("has_any_role", {
      _user_id: userId,
      _roles: ["qa_manager", "production_manager", "admin", "recipe_engineer"],
    });
    if (!ok) return { error: "You don't have access to QA insights." };

    let q = supabase.from("rms_records").select("id, data").eq("kind", "execution");
    if (data.recipeId) q = q.eq("data->>recipeId", data.recipeId);
    const { data: rows, error } = await q.limit(200);
    if (error) return { error: error.message };

    const batches = (rows ?? []).map((r) => {
      const e = r.data as Record<string, any>;
      const steps = (e.steps ?? []).filter((s: any) => s.actual != null).map((s: any) => ({
        step: `${s.phase} / ${s.parameter}`, target: s.target, actual: s.actual, unit: s.unit,
        offPct: s.target ? +(((s.actual - s.target) / Math.abs(s.target)) * 100).toFixed(1) : null,
        deviation: s.deviation ?? null,
      }));
      return { batch: e.batch, recipe: `${e.recipeCode} ${e.version}`, line: e.line, equipment: e.equipment,
        operator: e.operator, status: e.status, qc: e.qcStatus, yield: e.actualYield ?? null, notes: e.notes ?? null, steps };
    });
    if (!batches.length) return { error: "No batch records found for this selection yet." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "AI is not configured for this app." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: provider.responses(MODEL),
        instructions:
          "You are a QA analyst for a manufacturing recipe management system. Using only the batch data given, write concise markdown with these sections: " +
          "## Summary (2-3 sentences), ## Out-of-spec trends (bullets: parameter, batches affected, direction and size of drift, possible links to line/equipment/operator), " +
          "## Investigation questions for QA (5-8 numbered, specific questions), ## Suggested next checks. Do not invent data; say when data is too thin. Under 450 words.",
        messages: [{ role: "user", content: JSON.stringify(batches) }],
        providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
      });
      const text = await result.text;
      if (!text.trim()) return { error: "The AI returned no summary for this data." };
      return { text, batchCount: batches.length };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 402) return { error: "AI credits are used up. Add credits in workspace settings." };
      if (status === 429) return { error: "Too many AI requests right now. Try again in a minute." };
      return { error: e?.message ?? "AI request failed." };
    }
  });
