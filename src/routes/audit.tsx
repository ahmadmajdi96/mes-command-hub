import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, History as HistoryIcon } from "lucide-react";
import { useRms } from "@/lib/rms-store";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit Trail · Cortanex RMS" }, { name: "description", content: "Tamper-proof field-level audit trail." }] }),
  component: Audit,
});

function Audit() {
  const { audit } = useRms();
  const [q, setQ] = useState("");

  const filtered = audit.filter((a) => (q === "" || (a.entity + a.user + a.action + a.property).toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground">Every atomic field change, decoupled and tamper-proof.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="glass-panel flex items-center gap-2 rounded-2xl p-3">
        <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by user, entity, action…" className="h-9 flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none" />
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">Timestamp</th>
              <th className="py-3 pr-3 font-medium">User</th>
              <th className="py-3 pr-3 font-medium">Action</th>
              <th className="py-3 pr-3 font-medium">Target entity</th>
              <th className="py-3 pr-3 font-medium">Property</th>
              <th className="py-3 pr-3 font-medium">Before</th>
              <th className="py-3 pr-4 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-border/40 hover:bg-muted/20">
                <td className="py-3 pl-4 pr-3 font-mono text-xs text-muted-foreground">{a.ts}</td>
                <td className="py-3 pr-3 text-xs">{a.user}</td>
                <td className="py-3 pr-3"><span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">{a.action}</span></td>
                <td className="py-3 pr-3 font-mono text-xs">{a.entity}</td>
                <td className="py-3 pr-3 text-xs">{a.property}</td>
                <td className="py-3 pr-3 font-mono text-xs text-destructive/80">{a.before}</td>
                <td className="py-3 pr-4 font-mono text-xs text-success">{a.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
