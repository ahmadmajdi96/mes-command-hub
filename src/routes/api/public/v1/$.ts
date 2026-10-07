import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";

/**
 * External RMS API for MES Command Center, CORTA QC, ERP and equipment gateways.
 * Auth: header `x-api-key: rms_…` (hashed lookup, scope + expiry checked).
 */
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function authorize(request: Request, scope: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const token = request.headers.get("x-api-key") ?? "";
  if (!token.startsWith("rms_")) return { error: json({ error: "INVALID_AUTH_TOKEN" }, 401) };
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: key } = await supabaseAdmin.from("api_keys").select("*").eq("key_hash", hash).maybeSingle();
  if (!key || !key.active || (key.expires_at && new Date(key.expires_at) < new Date())) return { error: json({ error: "INVALID_AUTH_TOKEN" }, 401) };
  if (!key.scopes.includes(scope)) return { error: json({ error: "SCOPE_INSUFFICIENT", required: scope }, 403) };
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString(), call_count: key.call_count + 1 }).eq("id", key.id);
  return { admin: supabaseAdmin, key };
}

async function logInbound(admin: Admin, integration: string, event: string, payload: unknown, status: "accepted" | "rejected", response: string) {
  await admin.from("integration_messages").insert({ integration_id: integration, direction: "inbound", event, payload: payload as never, status, response, attempts: 1 });
}

const executionSchema = z.object({
  recipeId: z.string().min(1).max(64),
  productionOrder: z.string().min(1).max(64),
  batch: z.string().min(1).max(64),
  equipment: z.string().min(1).max(100),
  line: z.string().max(50).default(""),
  operator: z.string().min(1).max(100),
  status: z.enum(["running", "completed", "aborted"]).default("running"),
  actualYield: z.number().optional(),
});
const qcSchema = z.object({
  batch: z.string().min(1).max(64),
  result: z.enum(["passed", "failed"]),
  notes: z.string().max(1000).optional(),
});

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const path = (params._splat ?? "").replace(/\/$/, "");
        const auth = await authorize(request, "recipes:read");
        if ("error" in auth) return auth.error;
        const { admin } = auth;
        if (path === "recipes/released") {
          const { data } = await admin.from("recipes").select("id, code, name, version, status, updated_at").eq("status", "released");
          return json({ data });
        }
        const m = path.match(/^recipes\/([^/]+)(\/download|\/history)?$/);
        if (m) {
          const { data: r } = await admin.from("recipes").select("*").eq("id", m[1]).maybeSingle();
          if (!r) return json({ error: "NOT_FOUND" }, 404);
          if (m[2] === "/history") {
            const { data } = await admin.from("audit_log").select("ts, actor_name, action, before_value, after_value, reason, version, signed").eq("entity", r.id).order("ts");
            return json({ data });
          }
          if (r.status !== "released") return json({ error: "RECIPE_NOT_RELEASED" }, 403);
          return json({ data: r });
        }
        return json({ error: "NOT_FOUND" }, 404);
      },
      POST: async ({ request, params }) => {
        const path = (params._splat ?? "").replace(/\/$/, "");
        let body: unknown;
        try { body = await request.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }

        if (path === "executions") {
          const auth = await authorize(request, "executions:write");
          if ("error" in auth) return auth.error;
          const parsed = executionSchema.safeParse(body);
          if (!parsed.success) return json({ error: "VALIDATION", issues: parsed.error.issues }, 422);
          const e = parsed.data;
          const { data: r } = await auth.admin.from("recipes").select("id, code, version, status").eq("id", e.recipeId).maybeSingle();
          if (!r || r.status !== "released") {
            await logInbound(auth.admin, "INT-MES", "execution", body, "rejected", "RECIPE_NOT_RELEASED");
            return json({ error: "RECIPE_NOT_RELEASED" }, 403);
          }
          const id = `EX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          const now = new Date().toISOString().slice(0, 16).replace("T", " ");
          const { error } = await auth.admin.from("rms_records").insert({ kind: "execution", id, data: {
            id, recipeId: r.id, recipeCode: r.code, version: r.version, productionOrder: e.productionOrder, batch: e.batch,
            equipment: e.equipment, line: e.line, operator: e.operator, startedAt: now, finishedAt: e.status === "running" ? null : now,
            status: e.status, source: "MES", qcStatus: "pending", actualYield: e.actualYield, steps: [],
          } as never });
          if (error) return json({ error: "WRITE_FAILED" }, 500);
          await logInbound(auth.admin, "INT-MES", "execution", body, "accepted", id);
          return json({ id }, 201);
        }

        if (path === "quality/results") {
          const auth = await authorize(request, "quality:write");
          if ("error" in auth) return auth.error;
          const parsed = qcSchema.safeParse(body);
          if (!parsed.success) return json({ error: "VALIDATION", issues: parsed.error.issues }, 422);
          const { data: rows } = await auth.admin.from("rms_records").select("id, data").eq("kind", "execution").eq("data->>batch", parsed.data.batch);
          if (!rows?.length) {
            await logInbound(auth.admin, "INT-QMS", "inspection.result", body, "rejected", "BATCH_NOT_FOUND");
            return json({ error: "BATCH_NOT_FOUND" }, 404);
          }
          for (const row of rows) {
            const d = row.data as Record<string, unknown>;
            await auth.admin.from("rms_records").update({ data: { ...d, qcStatus: parsed.data.result, notes: parsed.data.notes ?? d.notes } as never }).eq("kind", "execution").eq("id", row.id);
          }
          await logInbound(auth.admin, "INT-QMS", "inspection.result", body, "accepted", `${rows.length} execution(s) updated`);
          return json({ updated: rows.length });
        }
        return json({ error: "NOT_FOUND" }, 404);
      },
    },
  },
});
