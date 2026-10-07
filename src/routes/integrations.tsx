import { createFileRoute } from "@tanstack/react-router";
import { Plug, RefreshCw, Power, ArrowLeftRight, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useRms } from "@/lib/rms-store";
import { apiCatalog } from "@/lib/rms-data";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [
    { title: "Integrations · Cortanex RMS" },
    { name: "description", content: "Connections to MES Command Center, CORTA QC, ERP and equipment, plus the RMS API catalog." },
    { property: "og:title", content: "Integrations · Cortanex RMS" },
    { property: "og:description", content: "Released recipes flow to MES; quality results and NCRs flow back from CORTA QC." },
  ] }),
  component: IntegrationsPage,
});

const DIR = { bidirectional: ArrowLeftRight, outbound: ArrowRight, inbound: ArrowLeft };
const METHOD: Record<string, string> = { GET: "text-success", POST: "text-info", PUT: "text-warning", DELETE: "text-destructive" };

function IntegrationsPage() {
  const { integrations, updateIntegration, can, logAudit } = useRms();
  const manage = can("integration.manage");
  const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Connected systems</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">RMS is the source of truth for recipes. MES executes released recipes; CORTA QC receives specs and returns quality results.</p>
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
              <div className="mt-3 rounded-lg bg-muted/20 px-2 py-1 font-mono text-[11px] text-muted-foreground">{i.baseUrl}</div>
              <ul className="mt-3 space-y-1 text-xs">{i.events.map((ev) => <li key={ev} className="font-mono text-[11px]">• {ev}</li>)}</ul>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Last sync {i.lastSync} · {i.messagesToday} msgs today</span>
                {manage && (
                  <div className="flex gap-1">
                    <button onClick={() => { updateIntegration(i.id, { lastSync: now(), status: i.status === "disconnected" ? "disconnected" : "connected" }); toast.success(`${i.system} synced`); }} className="rounded-md border border-border/60 p-1.5 hover:text-primary" title="Sync now"><RefreshCw className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { const s = i.status === "disconnected" ? "connected" : "disconnected"; updateIntegration(i.id, { status: s }); logAudit({ action: "CONFIG", entity: i.id, property: "status", before: i.status, after: s }); }} className="rounded-md border border-border/60 p-1.5 hover:text-primary" title="Toggle connection"><Power className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <div className="border-b border-border/60 p-4"><h3 className="text-sm font-semibold">RMS API catalog</h3><p className="text-xs text-muted-foreground">Authenticated with API keys (see API Keys). Base: /api/v1</p></div>
        <table className="w-full text-sm">
          <tbody>
            {apiCatalog.map((a) => (
              <tr key={a.method + a.path} className="border-t border-border/40">
                <td className={`w-20 py-2 pl-4 font-mono text-xs font-semibold ${METHOD[a.method]}`}>{a.method}</td>
                <td className="pr-3 font-mono text-xs">{a.path}</td>
                <td className="pr-3 text-xs text-muted-foreground">{a.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
