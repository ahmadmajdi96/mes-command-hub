import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRms } from "@/lib/rms-store";
import { Filter, Plus } from "lucide-react";

export const Route = createFileRoute("/materials")({
  head: () => ({ meta: [{ title: "Material Catalog · Cortanex RMS" }, { name: "description", content: "Master raw material catalog with user-defined attribute schemas." }] }),
  component: Materials,
});

function Materials() {
  const { materials, schemas } = useRms();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const cats = Array.from(new Set(materials.map((m) => m.category)));
  const filtered = materials.filter((m) =>
    (cat === "all" || m.category === cat) &&
    (q === "" || (m.name + m.id + m.category).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Material Catalog</h1>
          <p className="text-sm text-muted-foreground">Generic raw components with user-defined attribute schemas.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Add material
        </button>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="Search materials…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none" />
        </div>
        <button onClick={() => setCat("all")} className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${cat === "all" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>all</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${cat === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>{c}</button>
        ))}
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">ID</th>
              <th className="py-3 pr-3 font-medium">Name</th>
              <th className="py-3 pr-3 font-medium">Category</th>
              <th className="py-3 pr-3 font-medium">State</th>
              <th className="py-3 pr-3 font-medium">Schema</th>
              <th className="py-3 pr-3 font-medium text-right">Base cost</th>
              <th className="py-3 pr-3 font-medium">Custom attrs</th>
              <th className="py-3 pr-4 font-medium">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const sch = schemas.find((s) => s.id === m.schemaId);
              return (
                <tr key={m.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="py-3 pl-4 pr-3 font-mono text-xs text-muted-foreground">{m.id}</td>
                  <td className="py-3 pr-3 font-medium">{m.name}</td>
                  <td className="py-3 pr-3"><span className="rounded bg-muted/40 px-1.5 py-0.5 text-[11px]">{m.category}</span></td>
                  <td className="py-3 pr-3 text-xs">{m.physicalState}</td>
                  <td className="py-3 pr-3 text-[11px] text-muted-foreground">{sch?.name}</td>
                  <td className="py-3 pr-3 text-right font-mono">${m.baseCost.toFixed(2)}/{m.unit}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(m.attrs).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">{k}:{String(v)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-[11px] text-muted-foreground">{m.supplier ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
