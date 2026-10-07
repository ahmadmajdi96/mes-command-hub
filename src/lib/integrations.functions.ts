import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function deliver(id: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: msg } = await supabaseAdmin.from("integration_messages").select("*").eq("id", id).single();
  if (!msg) return { ok: false, error: "Message not found" };
  const { data: integ } = await supabaseAdmin.from("rms_records").select("data").eq("kind", "integration").eq("id", msg.integration_id).single();
  const cfg = (integ?.data ?? {}) as { baseUrl?: string; status?: string };
  let status: "delivered" | "failed" = "failed";
  let response = "";
  if (!cfg.baseUrl || !/^https?:\/\//.test(cfg.baseUrl)) {
    response = "Endpoint is not an HTTP(S) URL";
  } else if (cfg.status === "disconnected") {
    response = "Integration is disconnected";
  } else {
    try {
      const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-rms-event": msg.event },
        body: JSON.stringify({ event: msg.event, payload: msg.payload, sentAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(8000),
      });
      response = `HTTP ${res.status}`;
      status = res.ok ? "delivered" : "failed";
    } catch (e) {
      response = (e as Error).message.slice(0, 300);
    }
  }
  await supabaseAdmin.from("integration_messages").update({ status, response, attempts: msg.attempts + 1, updated_at: new Date().toISOString() }).eq("id", id);
  return { ok: status === "delivered", error: status === "failed" ? response : undefined };
}

async function requireStaff(supabase: { rpc: (fn: "has_any_role", args: { _user_id: string; _roles: ("admin" | "production_manager" | "qa_manager")[] }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_any_role", { _user_id: userId, _roles: ["admin", "production_manager", "qa_manager"] });
  if (!data) throw new Error("Forbidden");
}

/** Publish a recipe lifecycle event to connected systems (MES Command Center, CORTA QC, …). */
export const publishRecipeEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ recipeId: z.string().min(1).max(64), event: z.enum(["recipe.released", "recipe.approved", "recipe.obsoleted"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase as never, context.userId);
    const { data: recipe } = await context.supabase.from("recipes").select("*").eq("id", data.recipeId).single();
    if (!recipe) throw new Error("Recipe not found");
    const targets = data.event === "recipe.approved" ? ["INT-QMS"] : ["INT-MES", "INT-QMS"];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: { integration: string; ok: boolean; error?: string }[] = [];
    for (const t of targets) {
      const { data: row } = await supabaseAdmin.from("integration_messages")
        .insert({ integration_id: t, direction: "outbound", event: data.event, payload: recipe as never })
        .select("id").single();
      if (row) results.push({ integration: t, ...(await deliver(row.id)) });
    }
    return results;
  });

export const retryIntegrationMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase as never, context.userId);
    return deliver(data.id);
  });

export const pingIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integ } = await supabaseAdmin.from("rms_records").select("data").eq("kind", "integration").eq("id", data.id).single();
    const cfg = (integ?.data ?? {}) as Record<string, unknown> & { baseUrl?: string };
    let health: "connected" | "degraded" | "disconnected" = "disconnected";
    let detail = "Endpoint is not an HTTP(S) URL";
    if (cfg.baseUrl && /^https?:\/\//.test(cfg.baseUrl)) {
      try {
        const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(6000) });
        health = res.ok ? "connected" : "degraded";
        detail = `HTTP ${res.status}`;
      } catch (e) { detail = (e as Error).message.slice(0, 200); }
    }
    await supabaseAdmin.from("rms_records").update({ data: { ...cfg, status: health, lastSync: new Date().toISOString().slice(0, 16).replace("T", " ") } as never })
      .eq("kind", "integration").eq("id", data.id);
    return { health, detail };
  });
