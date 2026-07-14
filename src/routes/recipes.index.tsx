import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, Plus } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { recipeCost, groupedProjects, type RecipeStatus } from "@/lib/rms-data";

export const Route = createFileRoute("/recipes/")({
  head: () => ({ meta: [{ title: "Recipes · Cortanex RMS" }, { name: "description", content: "Browse and open recipes across R&D projects." }] }),
  component: RecipesPage,
});

function RecipesPage() {
  const { recipes, materials } = useRms();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RecipeStatus | "all">("all");

  const filtered = recipes.filter((r) =>
    (status === "all" || r.status === status) &&
    (q === "" || (r.name + r.code + r.project).toLowerCase().includes(q.toLowerCase()))
  );

  const groups = groupedProjects(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Recipes</h1>
          <p className="text-sm text-muted-foreground">Multi-level formulas with proportional or fixed scaling.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New draft
        </button>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <input placeholder="Filter recipes…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-64 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none" />
        </div>
        {(["all", "draft", "review", "regulatory", "costing", "released", "abandoned"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${status === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>{s}</button>
        ))}
      </div>

      {groups.map(({ project, items }) => (
        <div key={project} className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{project}</h3>
            <span className="text-[11px] text-muted-foreground">{items.length} recipes</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((r) => (
              <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className="group rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/40 hover:bg-card/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.code} · {r.version}</div>
                    <div className="mt-0.5 truncate text-sm font-semibold">{r.name}</div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Yield</div>
                    <div className="font-mono text-xs font-medium">{r.targetYield.value}{r.targetYield.unit}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Items</div>
                    <div className="font-mono text-xs font-medium">{r.items.length}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-[10px] text-muted-foreground">Cost</div>
                    <div className="font-mono text-xs font-medium">${recipeCost(r, materials).toFixed(0)}</div>
                  </div>
                </div>
                {r.branchLabel && (
                  <div className="mt-2 text-[11px] text-muted-foreground">Branch: <span className="text-foreground">{r.branchLabel}</span></div>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
