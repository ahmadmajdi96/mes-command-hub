import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Route as RouteIcon } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/traceability")({
  head: () => ({ meta: [
    { title: "Production Traceability · Cortanex RMS" },
    { name: "description", content: "Trace which recipe and version was used for each production order, batch, equipment, time and operator." },
    { property: "og:title", content: "Production Traceability · Cortanex RMS" },
    { property: "og:description", content: "Full genealogy from recipe version to batch, equipment, operator and QC result." },
  ] }),
  component: TracePage,
});

function TracePage() {
  const { executions, recipes, audit } = useRms();
  const [q, setQ] = useState("");
  const rows = executions.filter((e) => (e.batch + e.productionOrder + e.recipeCode + e.equipment + e.operator).toLowerCase().includes(q.toLowerCase()));
  const [sel, setSel] = useState<string | null>(executions[0]?.id ?? null);
  const e = executions.find((x) => x.id === sel);
  const r = e ? recipes.find((x) => x.id === e.recipeId) : undefined;
  const approvals = e ? audit.filter((a) => a.entity === e.recipeId && ["APPROVE", "RELEASE"].includes(a.action)) : [];

  return (
    <div className="space-y-5">
      <div className="glass-panel flex flex-wrap items-end justify-between gap-4 rounded-2xl p-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Genealogy</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Production Traceability</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recipe · version · order · batch · equipment · time · operator · QC.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Batch, order, equipment…" className="h-9 w-64 rounded-lg border border-border/60 bg-card/60 pl-8 pr-3 text-xs focus:border-primary/50 focus:outline-none" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="glass-panel overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3">Batch</th><th className="pr-3">Order</th><th className="pr-3">Recipe</th><th className="pr-3">Equipment</th><th className="pr-3">Operator</th><th className="pr-3">QC</th>
            </tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id} onClick={() => setSel(x.id)} className={`cursor-pointer border-t border-border/40 hover:bg-muted/10 ${sel === x.id ? "bg-primary/5" : ""}`}>
                  <td className="py-2.5 pl-4 pr-3 font-mono text-xs text-primary">{x.batch}</td>
                  <td className="pr-3 font-mono text-xs">{x.productionOrder}</td>
                  <td className="pr-3 text-xs">{x.recipeCode} {x.version}</td>
                  <td className="pr-3 text-xs">{x.equipment}</td>
                  <td className="pr-3 text-xs">{x.operator}</td>
                  <td className="pr-3"><StatusPill status={x.qcStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {e && (
          <div className="glass-panel h-fit rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><RouteIcon className="h-4 w-4 text-primary" /> {e.batch}</h3>
            <ol className="mt-4 space-y-3 border-l border-border/60 pl-4 text-xs">
              <li><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recipe</div>
                {r ? <Link to="/recipes/$id" params={{ id: r.id }} className="font-medium text-primary">{r.name} · {e.version}</Link> : e.recipeCode}
                {r && <div className="text-muted-foreground">Author {r.createdBy} · current status {r.status}</div>}</li>
              <li><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Approvals</div>
                {r?.approvedBy.length ? r.approvedBy.join(", ") : "—"}
                {approvals.map((a) => <div key={a.id} className="text-muted-foreground">{a.action} by {a.user} · {a.ts}</div>)}</li>
              <li><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Production order</div>{e.productionOrder} · via {e.source}</li>
              <li><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Equipment</div>{e.equipment} · {e.line}</li>
              <li><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Execution</div>{e.operator} · {e.startedAt} → {e.finishedAt ?? "running"}{e.actualYield ? ` · yield ${e.actualYield}` : ""}</li>
              <li><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality (CORTA QC)</div><StatusPill status={e.qcStatus} />{e.notes && <div className="mt-1 text-muted-foreground">{e.notes}</div>}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
