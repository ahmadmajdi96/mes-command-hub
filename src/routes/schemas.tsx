import { createFileRoute } from "@tanstack/react-router";
import { Plus, Database } from "lucide-react";
import { useRms } from "@/lib/rms-store";

export const Route = createFileRoute("/schemas")({
  head: () => ({ meta: [{ title: "Attribute Schemas · Cortanex RMS" }, { name: "description", content: "Custom attribute schema builder for industry-agnostic material profiling." }] }),
  component: Schemas,
});

function Schemas() {
  const { schemas } = useRms();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Attribute Schemas</h1>
          <p className="text-sm text-muted-foreground">Inject industry-specific fields (allergens, CAS, pH…) onto generic materials.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New schema
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {schemas.map((s) => (
          <div key={s.id} className="glass-panel rounded-2xl p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Database className="h-3 w-3" /> {s.domain}
                </div>
                <h3 className="mt-1 text-sm font-semibold">{s.name}</h3>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{s.id}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Key</th>
                  <th className="py-1.5 pr-3 font-medium">Label</th>
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody>
                {s.fields.map((f) => (
                  <tr key={f.key} className="border-t border-border/40">
                    <td className="py-2 pr-3 font-mono text-xs text-primary">{f.key}</td>
                    <td className="py-2 pr-3">{f.label}</td>
                    <td className="py-2 pr-3"><span className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">{f.type}</span></td>
                    <td className="py-2 pr-3 text-[11px] text-muted-foreground">{f.unit ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40">
              <Plus className="h-3 w-3" /> Append field
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
