import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lock, Save, ChevronRight, GitBranch, Beaker, GitCompareArrows, ShieldCheck } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { recipeCost, statusLabel, type RecipeStatus } from "@/lib/rms-data";

export const Route = createFileRoute("/recipes/$id")({
  head: ({ params }) => ({ meta: [{ title: `Recipe ${params.id} · Sandbox Formulator` }, { name: "description", content: "Multi-level formulation sandbox with live property rollup and scaling controls." }] }),
  component: RecipeDetail,
});

const GATE_ORDER: RecipeStatus[] = ["draft", "review", "regulatory", "costing", "released"];

function RecipeDetail() {
  const { id } = Route.useParams();
  const { recipes, materials, updateRecipeItem, moveGate, role } = useRms();
  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) throw notFound();

  const [scaleTarget, setScaleTarget] = useState<number>(recipe.targetYield.value);
  const [scaleMode, setScaleMode] = useState<"proportional" | "locked">("proportional");
  const [anchorId, setAnchorId] = useState(recipe.items[0]?.id ?? "");

  const locked = ["review", "regulatory", "costing", "released"].includes(recipe.status);

  // Live rollup
  const totalPct = useMemo(() => recipe.items.reduce((a, it) => a + it.targetPct, 0), [recipe.items]);
  const cost = recipeCost(recipe, materials);
  const scaledCost = cost * (scaleTarget / recipe.targetYield.value);

  // Related branches
  const siblings = recipes.filter((r) => r.parentId === recipe.parentId && r.parentId);
  const children = recipes.filter((r) => r.parentId === recipe.id);

  const currentGateIdx = GATE_ORDER.indexOf(recipe.status);
  const nextGate = currentGateIdx >= 0 && currentGateIdx < GATE_ORDER.length - 1 ? GATE_ORDER[currentGateIdx + 1] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/recipes" className="hover:underline">Recipes</Link>
            <ChevronRight className="h-3 w-3" />
            <span>{recipe.project}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{recipe.name} <span className="text-muted-foreground">{recipe.version}</span></h1>
          <p className="text-sm text-muted-foreground">{recipe.code} · {recipe.classification} · updated {recipe.updatedAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={recipe.status} />
          {locked && <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[11px] text-warning"><Lock className="h-3 w-3" /> Fields locked</span>}
          {nextGate && !locked && (
            <button
              onClick={() => moveGate(recipe.id, nextGate)}
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
            >
              Advance → {statusLabel(nextGate)}
            </button>
          )}
        </div>
      </div>

      {/* 3-pane workspace */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,320px)]">
        {/* LEFT — project & version tree */}
        <aside className="glass-panel rounded-2xl p-4">
          <h4 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Project tree</h4>
          <div className="mt-3 space-y-1 font-mono text-xs">
            <div className="text-primary">▼ {recipe.project}</div>
            {recipes.filter((r) => r.project === recipe.project).map((r) => (
              <Link key={r.id} to="/recipes/$id" params={{ id: r.id }}
                className={`ml-3 flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40 ${r.id === recipe.id ? "bg-primary/10 text-primary" : ""}`}>
                <span>├─ {r.version}</span>
                <span className="text-[10px] text-muted-foreground">{statusLabel(r.status)}</span>
              </Link>
            ))}
          </div>

          {(siblings.length > 1 || children.length > 0) && (
            <>
              <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><GitBranch className="h-3 w-3" /> Branches</div>
              <div className="mt-2 space-y-1 text-xs">
                {siblings.filter((s) => s.id !== recipe.id).map((s) => (
                  <Link key={s.id} to="/recipes/$id" params={{ id: s.id }} className="block rounded px-2 py-1 hover:bg-muted/40">
                    ↳ {s.branchLabel ?? s.version}
                  </Link>
                ))}
                {children.map((c) => (
                  <Link key={c.id} to="/recipes/$id" params={{ id: c.id }} className="block rounded px-2 py-1 hover:bg-muted/40">
                    ↳ {c.branchLabel ?? c.version}
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 space-y-1.5">
            <Link to="/compare" className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs hover:border-primary/40"><GitCompareArrows className="h-3.5 w-3.5" /> Compare versions</Link>
            <Link to="/trials" className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs hover:border-primary/40"><Beaker className="h-3.5 w-3.5" /> Trial history</Link>
          </div>
        </aside>

        {/* MIDDLE — formulation sandbox */}
        <section className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Formulation Sandbox</h3>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`rounded px-2 py-0.5 ${totalPct === 100 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                Σ = {totalPct.toFixed(4)}%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Component</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium text-right">Target %</th>
                  <th className="py-2 pr-3 font-medium text-right">Min</th>
                  <th className="py-2 pr-3 font-medium text-right">Max</th>
                  <th className="py-2 pr-3 font-medium text-right">Scaled qty</th>
                  <th className="py-2 pr-3 font-medium">Scaling</th>
                </tr>
              </thead>
              <tbody>
                {recipe.items.map((it) => {
                  const scaledQty = (scaleTarget * it.targetPct) / 100;
                  const m = materials.find((mm) => mm.id === it.refId);
                  return (
                    <tr key={it.id} className="border-t border-border/40">
                      <td className="py-2 pr-3">
                        <div className="text-sm font-medium">{it.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{it.refId} · {m?.category ?? "sub-recipe"}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{it.refType}</span>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <input
                          disabled={locked}
                          type="number"
                          value={it.targetPct}
                          step="0.0001"
                          onChange={(e) => updateRecipeItem(recipe.id, it.id, { targetPct: Number(e.target.value) })}
                          className="w-24 rounded-md border border-border/60 bg-card/60 px-2 py-1 text-right font-mono text-xs focus:border-primary/50 focus:outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">{it.minPct.toFixed(4)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-muted-foreground">{it.maxPct.toFixed(4)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs">{scaledQty.toFixed(4)} {it.unit}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${it.scaling === "fixed" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>{it.scaling}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
            Drag components from the catalog to add rows. Nested sub-recipes supported up to 5 levels.
          </div>

          {/* Process */}
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Process steps</h4>
            <div className="mt-2 space-y-2">
              {recipe.process.map((p) => (
                <div key={p.seq} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">{p.seq}</span>
                  <div className="flex-1">
                    <div className="font-medium">{p.phase}</div>
                    <div className="text-[11px] text-muted-foreground">{p.parameter} = {p.targetValue}{p.unit} · {p.durationMin} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT — live calculations */}
        <aside className="glass-panel h-fit rounded-2xl p-5">
          <h4 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live rollup</h4>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total batch weight</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-glow">{scaleTarget.toFixed(2)} {recipe.targetYield.unit}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Theoretical cost</div>
                <div className="mt-1 font-mono text-lg font-semibold">${scaledCost.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Line items</div>
                <div className="mt-1 font-mono text-lg font-semibold">{recipe.items.length}</div>
              </div>
            </div>

            {/* Scaling controls */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Target scaling</div>
              <div className="mb-2 flex gap-1 text-[11px]">
                <button onClick={() => setScaleMode("proportional")} className={`flex-1 rounded-md px-2 py-1 ${scaleMode === "proportional" ? "bg-primary/10 text-primary" : "bg-card/60 text-muted-foreground"}`}>Proportional yield</button>
                <button onClick={() => setScaleMode("locked")} className={`flex-1 rounded-md px-2 py-1 ${scaleMode === "locked" ? "bg-primary/10 text-primary" : "bg-card/60 text-muted-foreground"}`}>Locked base</button>
              </div>
              {scaleMode === "proportional" ? (
                <div>
                  <label className="text-[11px] text-muted-foreground">Target yield ({recipe.targetYield.unit})</label>
                  <input type="number" value={scaleTarget} step="1" onChange={(e) => setScaleTarget(Number(e.target.value) || 0)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-sm" />
                </div>
              ) : (
                <div className="space-y-2">
                  <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)} className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-xs">
                    {recipe.items.map((it) => <option key={it.id} value={it.id}>{it.name} (anchor 100%)</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground">Anchor fixed at 100%; secondary additives scale around it.</p>
                </div>
              )}
            </div>

            {/* Compliance */}
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Compliance</div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Hazards</span><span>{recipe.compliance.hazards.join(", ") || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Allergens</span><span>{recipe.compliance.allergens.join(", ") || "None"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Storage ≤</span><span>{recipe.compliance.storageMaxC}°C</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shelf life</span><span>{recipe.compliance.shelfLifeDays} d</span></div>
              </div>
            </div>

            <button disabled={locked} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
              <Save className="h-4 w-4" /> Save draft ({role})
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
