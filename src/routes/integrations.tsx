import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plug, RefreshCw, Power, ArrowLeftRight, ArrowRight, ArrowLeft, Activity, RotateCcw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useRms } from "@/lib/rms-store";
import { apiCatalog } from "@/lib/rms-data";
import { StatusPill } from "@/components/status-pill";
import { pingIntegration, retryIntegrationMessage } from "@/lib/integrations.functions";
import { AccessDenied } from "@/components/access-denied";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [
    { title: "Integrations · Cortanex RMS" },
    { name: "description", content: "Connections to MES Command Center, CORTA QC, ERP and equipment, message log and RMS API catalog." },
    { property: "og:title", content: "Integrations · Cortanex RMS" },
    { property: "og:description", content: "Released recipes flow to MES; quality results flow back from CORTA QC." },
  ] }),
  component: IntegrationsPage,
});

const DIR = { bidirectional: ArrowLeftRight, outbound: ArrowRight, inbound: ArrowLeft };
const METHOD: Record<string, string> = { GET: "text-success", POST: "text-info", PUT: "text-warning", DELETE: "text-destructive" };

const API = [
  { method: "GET", path: "/api/public/v1/recipes/released", desc: "Released recipes (scope recipes:read)" },
  { method: "GET", path: "/api/public/v1/recipes/{id}", desc: "Released recipe detail / download (recipes:read)" },
  { method: "GET", path: "/api/public/v1/recipes/{id}/history", desc: "Status & signature history (recipes:read)" },
  { method: "POST", path: "/api/public/v1/executions", desc: "MES posts execution {recipeId, productionOrder, batch, equipment, operator, status} (executions:write)" },
  { method: "POST", path: "/api/public/v1/quality/results", desc: "CORTA QC posts {batch, result: passed|failed, notes} (quality:write)" },
];

function IntegrationsPage() {
  const { integrations, updateIntegration, can, messages, loadMessages, refresh } = useRms();
  const ping = useServerFn(pingIntegration);
  const retry = useServerFn(retryIntegrationMessage);
  const manage = can("integration.manage");
  const [editing, setEditing] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState<"all" | "failed">("all");
  useEffect(() => { loadMessages(); }, [loadMessages]);
  if (!(can("integration.manage") || can("recipe.release") || can("recipe.approve"))) return <AccessDenied what="integrations" />;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shown = messages.filter((m) => filter === "all" || m.status === "failed" || m.status === "rejected");

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Connected systems</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">RMS is the source of truth. Releasing a recipe publishes it to MES Command Center and CORTA QC; executions and quality results come back through the RMS API.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((i) => {
          const D = DIR[i.direction];
          return (
            <div key={i.id} className="glass-panel rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Plug className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">{i.system}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><D className="h-3 w-3" /> {i.kind} · {i.direction}</div>
                  </div>
                </div>
                <StatusPill status={i.status} />
              </div>
              {editing === i.id ? (
                <div className="mt-3 flex gap-2">
                  <input value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 flex-1 rounded-lg border border-border/60 bg-card/60 px-2 font-mono text-[11px]" />
                  <button onClick={() => { if (!/^(https?|opc\.tcp):\/\//.test(url)) return toast.error("Enter a valid URL"); updateIntegration(i.id, { baseUrl: url }); setEditing(null); }} className="rounded-md bg-primary px-2 text-xs text-primary-foreground">Save</button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/20 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  <span className="flex-1 truncate">{i.baseUrl}</span>
                  {manage && <button onClick={() => { setEditing(i.id); setUrl(i.baseUrl); }} className="hover:text-primary"><Pencil className="h-3 w-3" /></button>}
                </div>
              )}
              <ul className="mt-3 space-y-1 text-xs">{i.events.map((ev) => <li key={ev} className="font-mono text-[11px]">• {ev}</li>)}</ul>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Last check {i.lastSync}</span>
                {manage && (
                  <div className="flex gap-1">
                    <button onClick={async () => { const r = await ping({ data: { id: i.id } }); toast[r.health === "connected" ? "success" : "error"](`${i.system}: ${r.health} (${r.detail})`); refresh(); }} className="rounded-md border border-border/60 p-1.5 hover:text-primary" title="Health check"><Activity className="h-3.5 w-3.5" /></button>
                    <button onClick={() => updateIntegration(i.id, { status: i.status === "disconnected" ? "connected" : "disconnected" })} className="rounded-md border border-border/60 p-1.5 hover:text-primary" title="Enable / disable"><Power className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 p-4">
          <div><h3 className="text-sm font-semibold">Message log</h3><p className="text-xs text-muted-foreground">Every message sent to or received from connected systems.</p></div>
          <div className="flex gap-2 text-xs">
            {(["all", "failed"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-md border px-2 py-1 ${filter === f ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"}`}>{f === "all" ? "All" : "Failed only"}</button>)}
            <button onClick={() => loadMessages()} className="rounded-md border border-border/60 p-1.5"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th className="py-2 pl-4 pr-3">Time</th><th className="pr-3">System</th><th className="pr-3">Direction</th><th className="pr-3">Event</th><th className="pr-3">Status</th><th className="pr-3">Response</th><th className="pr-3">Tries</th><th></th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">No messages yet. Releasing a recipe publishes it to MES and CORTA QC.</td></tr>}
            {shown.map((m) => (
              <tr key={m.id} className="border-t border-border/40">
                <td className="py-2 pl-4 pr-3 font-mono text-[11px]">{m.created_at.slice(0, 16).replace("T", " ")}</td>
                <td className="pr-3 text-xs">{integrations.find((i) => i.id === m.integration_id)?.system ?? m.integration_id}</td>
                <td className="pr-3 text-xs">{m.direction}</td>
                <td className="pr-3 font-mono text-xs">{m.event}</td>
                <td className="pr-3"><StatusPill status={m.status === "delivered" || m.status === "accepted" ? "passed" : m.status === "pending" ? "pending" : "failed"} /></td>
                <td className="max-w-[240px] truncate pr-3 text-[11px] text-muted-foreground" title={m.response ?? ""}>{m.response}</td>
                <td className="pr-3 font-mono text-xs">{m.attempts}</td>
                <td className="pr-3">{m.direction === "outbound" && m.status === "failed" && (
                  <button onClick={async () => { const r = await retry({ data: { id: m.id } }); toast[r.ok ? "success" : "error"](r.ok ? "Delivered" : `Still failing: ${r.error}`); loadMessages(); }} title="Retry" className="rounded p-1 hover:text-primary"><RotateCcw className="h-4 w-4" /></button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <div className="border-b border-border/60 p-4"><h3 className="text-sm font-semibold">RMS API</h3><p className="text-xs text-muted-foreground">Live endpoints. Base URL <code className="font-mono text-primary">{origin}</code>. Authenticate with an API key in the <code className="font-mono">x-api-key</code> header.</p></div>
        <table className="w-full text-sm"><tbody>
          {API.map((a) => (
            <tr key={a.method + a.path} className="border-t border-border/40">
              <td className={`w-20 py-2 pl-4 font-mono text-xs font-semibold ${METHOD[a.method]}`}>{a.method}</td>
              <td className="pr-3 font-mono text-xs">{a.path}</td>
              <td className="pr-3 text-xs text-muted-foreground">{a.desc}</td>
            </tr>
          ))}
        </tbody></table>
        <details className="border-t border-border/40 p-4 text-xs text-muted-foreground"><summary className="cursor-pointer">Planned endpoints (internal catalog)</summary>
          <ul className="mt-2 space-y-1">{apiCatalog.map((a) => <li key={a.method + a.path} className="font-mono">{a.method} {a.path} — {a.desc}</li>)}</ul>
        </details>
      </div>
    </div>
  );
}
