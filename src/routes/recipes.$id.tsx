import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lock, Save, ChevronRight, GitBranch, Beaker, GitCompareArrows, ShieldCheck, Layers, DollarSign, Gauge, FlaskConical, ArrowUpRight, Clock, Users, Plus, Trash2, Pencil } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { recipeCost, statusLabel, type RecipeStatus, type RecipeItem, type ProcessStep, type Recipe } from "@/lib/rms-data";
import { EntityFormDialog, ConfirmDialog, type FieldSpec } from "@/components/entity-form-dialog";

export const Route = createFileRoute("/recipes/$id")({
  head: ({ params }) => ({ meta: [{ title: `Recipe ${params.id} · Sandbox Formulator` }, { name: "description", content: "Multi-level formulation sandbox with live property rollup and scaling controls." }] }),
  component: RecipeDetail,
});

const GATE_ORDER: RecipeStatus[] = ["draft", "review", "regulatory", "costing", "released"];

function RecipeDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const {
    recipes, materials, updateRecipeItem, moveGate, role,
    addRecipeItem, removeRecipeItem, updateRecipe, deleteRecipe,
    addProcessStep, updateProcessStep, removeProcessStep,
  } = useRms();
  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) throw notFound();

  const [scaleTarget, setScaleTarget] = useState<number>(recipe.targetYield.value);
  const [scaleMode, setScaleMode] = useState<"proportional" | "locked">("proportional");
  const [anchorId, setAnchorId] = useState(recipe.items[0]?.id ?? "");
  const [tab, setTab] = useState<"formulation" | "process" | "compliance">("formulation");

  const [editingItem, setEditingItem] = useState<RecipeItem | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [deleteStepSeq, setDeleteStepSeq] = useState<number | null>(null);

  const [editingMeta, setEditingMeta] = useState(false);
  const [deleteRecipeOpen, setDeleteRecipeOpen] = useState(false);

  const locked = ["review", "regulatory", "costing", "released"].includes(recipe.status);

  const totalPct = useMemo(() => recipe.items.reduce((a, it) => a + it.targetPct, 0), [recipe.items]);
  const cost = recipeCost(recipe, materials);
  const scaledCost = cost * (scaleTarget / recipe.targetYield.value);

  const siblings = recipes.filter((r) => r.parentId === recipe.parentId && r.parentId);
  const children = recipes.filter((r) => r.parentId === recipe.id);

  const currentGateIdx = GATE_ORDER.indexOf(recipe.status);
  const nextGate = currentGateIdx >= 0 && currentGateIdx < GATE_ORDER.length - 1 ? GATE_ORDER[currentGateIdx + 1] : null;

  const itemFields = useMemo<FieldSpec[]>(() => [
    { key: "refType", label: "Reference type", type: "select", required: true, options: [
      { value: "material", label: "Material" }, { value: "recipe", label: "Sub-recipe" },
    ] },
    { key: "refId", label: "Reference", type: "select", required: true, options: [
      ...materials.map((m) => ({ value: m.id, label: `${m.id} · ${m.name}` })),
      ...recipes.filter((r) => r.id !== recipe.id).map((r) => ({ value: r.id, label: `${r.id} · ${r.name}` })),
    ] },
    { key: "name", label: "Display name", type: "text", required: true },
    { key: "targetPct", label: "Target %", type: "number", required: true, step: 0.0001 },
    { key: "minPct", label: "Min %", type: "number", step: 0.0001 },
    { key: "maxPct", label: "Max %", type: "number", step: 0.0001 },
    { key: "unit", label: "Unit", type: "text", required: true, placeholder: "kg / L / ea" },
    { key: "scaling", label: "Scaling", type: "select", required: true, options: [
      { value: "proportional", label: "Proportional" }, { value: "fixed", label: "Fixed" },
    ] },
  ], [materials, recipes, recipe.id]);

  const stepFields = useMemo<FieldSpec[]>(() => [
    { key: "phase", label: "Phase", type: "text", required: true, placeholder: "e.g. High-Shear Mixing" },
    { key: "parameter", label: "Parameter", type: "text", required: true, placeholder: "RPM / Temperature" },
    { key: "targetValue", label: "Target value", type: "number", required: true },
    { key: "unit", label: "Unit", type: "text", required: true, placeholder: "rpm / °C" },
    { key: "durationMin", label: "Duration (min)", type: "number", required: true, min: 0 },
  ], []);

  const metaFields = useMemo<FieldSpec[]>(() => [
    { key: "name", label: "Recipe name", type: "text", required: true },
    { key: "code", label: "Code", type: "text", required: true },
    { key: "version", label: "Version", type: "text", required: true },
    { key: "project", label: "Project", type: "text", required: true },
    { key: "branchLabel", label: "Branch label", type: "text" },
    { key: "classification", label: "Classification", type: "text", required: true },
    { key: "targetYieldValue", label: "Target yield", type: "number", required: true, step: 0.01 },
    { key: "targetYieldUnit", label: "Yield unit", type: "text", required: true },
    { key: "storageMaxC", label: "Storage max (°C)", type: "number", required: true },
    { key: "shelfLifeDays", label: "Shelf life (days)", type: "number", required: true, min: 0 },
    { key: "hazards", label: "Hazards", type: "tags" },
    { key: "allergens", label: "Allergens", type: "tags" },
  ], []);

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-48 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link to="/recipes" className="hover:text-primary">Recipes</Link>
              <ChevronRight className="h-3 w-3" />
              <span>{recipe.project}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-mono text-primary">{recipe.code}</span>
            </div>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold tracking-tight">
              {recipe.name}
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm text-primary">{recipe.version}</span>
              {recipe.branchLabel && <span className="rounded-md bg-info/10 px-2 py-0.5 font-mono text-xs text-info">↳ {recipe.branchLabel}</span>}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {recipe.classification}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.updatedAt}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {recipe.createdBy}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <StatusPill status={recipe.status} />
              <button onClick={() => setEditingMeta(true)} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/60 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /> Edit</button>
              <button onClick={() => setDeleteRecipeOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
            {locked && <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-1 text-[11px] text-warning"><Lock className="h-3 w-3" /> Fields locked</span>}
            {nextGate && !locked && (
              <button onClick={() => moveGate(recipe.id, nextGate)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
                Advance → {statusLabel(nextGate)} <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Stage progress */}
        <div className="relative mt-6">
          <div className="flex items-center gap-2">
            {GATE_ORDER.map((g, i) => {
              const active = i <= currentGateIdx;
              return (
                <div key={g} className="flex flex-1 items-center gap-2">
                  <div className={`flex flex-1 flex-col rounded-lg border px-3 py-2 ${active ? "border-primary/40 bg-primary/10" : "border-border/60 bg-card/30"}`}>
                    <div className={`text-[9px] uppercase tracking-wider ${active ? "text-primary" : "text-muted-foreground"}`}>Stage {i + 1}</div>
                    <div className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{statusLabel(g)}</div>
                  </div>
                  {i < GATE_ORDER.length - 1 && <div className={`h-px w-3 ${i < currentGateIdx ? "bg-primary" : "bg-border/60"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* KPIs */}
        <div className="relative mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Yield", value: `${recipe.targetYield.value}${recipe.targetYield.unit}`, icon: Gauge, tone: "text-info" },
            { label: "Components", value: recipe.items.length, icon: FlaskConical, tone: "text-primary" },
            { label: "Theoretical cost", value: `$${cost.toFixed(0)}`, icon: DollarSign, tone: "text-accent" },
            { label: "Σ target %", value: `${totalPct.toFixed(2)}%`, icon: Layers, tone: totalPct === 100 ? "text-success" : "text-warning" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <k.icon className={`h-3.5 w-3.5 ${k.tone}`} />
              </div>
              <div className={`mt-1 font-mono text-xl font-semibold ${k.tone}`}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,340px)]">
        <aside className="glass-panel h-fit rounded-2xl p-4">
          <h4 className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><GitBranch className="h-3 w-3" /> Project tree</h4>
          <div className="mt-3 space-y-1 font-mono text-xs">
            <div className="text-primary">▼ {recipe.project}</div>
            {recipes.filter((r) => r.project === recipe.project).map((r) => (
              <Link key={r.id} to="/recipes/$id" params={{ id: r.id }}
                className={`ml-3 flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40 ${r.id === recipe.id ? "bg-primary/10 text-primary" : ""}`}>
                <span className="truncate">├─ {r.version}</span>
                <span className="ml-2 text-[9px] uppercase text-muted-foreground">{statusLabel(r.status)}</span>
              </Link>
            ))}
          </div>

          {(siblings.length > 1 || children.length > 0) && (
            <div className="mt-4 border-t border-border/40 pt-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><GitBranch className="h-3 w-3" /> Related branches</div>
              <div className="mt-2 space-y-1 text-xs">
                {siblings.filter((s) => s.id !== recipe.id).map((s) => (
                  <Link key={s.id} to="/recipes/$id" params={{ id: s.id }} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40">
                    <span>↳ {s.branchLabel ?? s.version}</span><StatusPill status={s.status} />
                  </Link>
                ))}
                {children.map((c) => (
                  <Link key={c.id} to="/recipes/$id" params={{ id: c.id }} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40">
                    <span>↳ {c.branchLabel ?? c.version}</span><StatusPill status={c.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-1.5 border-t border-border/40 pt-4">
            <Link to="/compare" className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs hover:border-primary/40 hover:text-primary"><span className="flex items-center gap-2"><GitCompareArrows className="h-3.5 w-3.5" /> Compare</span><ArrowUpRight className="h-3 w-3" /></Link>
            <Link to="/trials" className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs hover:border-primary/40 hover:text-primary"><span className="flex items-center gap-2"><Beaker className="h-3.5 w-3.5" /> Trials</span><ArrowUpRight className="h-3 w-3" /></Link>
            <Link to="/audit" className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs hover:border-primary/40 hover:text-primary"><span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Audit log</span><ArrowUpRight className="h-3 w-3" /></Link>
          </div>
        </aside>

        <section className="glass-panel rounded-2xl">
          <div className="flex items-center gap-1 border-b border-border/60 px-2 pt-2">
            {(["formulation", "process", "compliance"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition ${tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
                {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 px-3 text-[11px]">
              <span className={`rounded px-2 py-0.5 ${totalPct === 100 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>Σ = {totalPct.toFixed(4)}%</span>
            </div>
          </div>

          {tab === "formulation" && (
            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Component</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium text-right">Target %</th>
                      <th className="py-2 pr-3 font-medium">Range</th>
                      <th className="py-2 pr-3 font-medium text-right">Scaled qty</th>
                      <th className="py-2 pr-3 font-medium">Scaling</th>
                      <th className="py-2 pr-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.items.map((it) => {
                      const scaledQty = (scaleTarget * it.targetPct) / 100;
                      const m = materials.find((mm) => mm.id === it.refId);
                      const pctOfMax = it.maxPct > 0 ? (it.targetPct / it.maxPct) * 100 : 0;
                      const outOfRange = it.targetPct < it.minPct || it.targetPct > it.maxPct;
                      return (
                        <tr key={it.id} className="border-t border-border/40 hover:bg-muted/10">
                          <td className="py-2.5 pr-3">
                            <div className="text-sm font-medium">{it.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{it.refId} · {m?.category ?? "sub-recipe"}</div>
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${it.refType === "recipe" ? "bg-info/10 text-info" : "bg-muted/50 text-muted-foreground"}`}>{it.refType}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <input disabled={locked} type="number" value={it.targetPct} step="0.0001"
                              onChange={(e) => updateRecipeItem(recipe.id, it.id, { targetPct: Number(e.target.value) })}
                              className={`w-24 rounded-md border bg-card/60 px-2 py-1 text-right font-mono text-xs focus:outline-none disabled:opacity-60 ${outOfRange ? "border-destructive/60 text-destructive" : "border-border/60 focus:border-primary/50"}`} />
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/40">
                                <div className={`h-full ${outOfRange ? "bg-destructive" : "bg-primary/70"}`} style={{ width: `${Math.min(pctOfMax, 100)}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground">{it.minPct.toFixed(2)}–{it.maxPct.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs">{scaledQty.toFixed(4)} <span className="text-muted-foreground">{it.unit}</span></td>
                          <td className="py-2.5 pr-3">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${it.scaling === "fixed" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>{it.scaling}</span>
                          </td>
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center justify-end gap-1">
                              <button disabled={locked} onClick={() => setEditingItem(it)} className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-30"><Pencil className="h-3 w-3" /></button>
                              <button disabled={locked} onClick={() => setDeleteItemId(it.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button disabled={locked} onClick={() => setAddingItem(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> Add component
              </button>
            </div>
          )}

          {tab === "process" && (
            <div className="p-5">
              <div className="relative space-y-3">
                <div className="pointer-events-none absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
                {recipe.process.map((p) => (
                  <div key={p.seq} className="relative flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                    <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-xs text-primary ring-4 ring-background">{p.seq}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{p.phase}</div>
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{p.durationMin} min</span>
                          <button disabled={locked} onClick={() => setEditingStep(p)} className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-30"><Pencil className="h-3 w-3" /></button>
                          <button disabled={locked} onClick={() => setDeleteStepSeq(p.seq)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        <span className="font-mono text-primary">{p.parameter}</span> = <span className="font-mono">{p.targetValue}{p.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button disabled={locked} onClick={() => setAddingStep(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" /> Add process step
              </button>
            </div>
          )}

          {tab === "compliance" && (
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                { label: "Hazards", value: recipe.compliance.hazards.join(", ") || "None declared", tone: "text-warning" },
                { label: "Allergens", value: recipe.compliance.allergens.join(", ") || "None", tone: "text-accent" },
                { label: "Storage max", value: `${recipe.compliance.storageMaxC} °C`, tone: "text-info" },
                { label: "Shelf life", value: `${recipe.compliance.shelfLifeDays} days`, tone: "text-primary" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  <div className={`mt-1 text-sm font-semibold ${c.tone}`}>{c.value}</div>
                </div>
              ))}
              <div className="col-span-full rounded-xl border border-border/60 bg-card/40 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Approvals</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {recipe.approvedBy.length ? recipe.approvedBy.map((a) => (
                    <span key={a} className="rounded-md bg-success/10 px-2 py-1 text-[11px] text-success">{a}</span>
                  )) : <span className="text-xs text-muted-foreground">Awaiting first sign-off</span>}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="glass-panel sticky top-4 h-fit rounded-2xl p-5">
          <h4 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Live rollup</h4>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total batch weight</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-primary text-glow">{scaleTarget.toFixed(2)} {recipe.targetYield.unit}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">×{(scaleTarget / recipe.targetYield.value).toFixed(3)} baseline</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Scaled cost</div>
                <div className="mt-1 font-mono text-lg font-semibold text-accent">${scaledCost.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Line items</div>
                <div className="mt-1 font-mono text-lg font-semibold">{recipe.items.length}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Target scaling</div>
              <div className="mb-2 flex gap-1 rounded-md bg-background/40 p-0.5 text-[11px]">
                <button onClick={() => setScaleMode("proportional")} className={`flex-1 rounded px-2 py-1 ${scaleMode === "proportional" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>Proportional</button>
                <button onClick={() => setScaleMode("locked")} className={`flex-1 rounded px-2 py-1 ${scaleMode === "locked" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>Locked base</button>
              </div>
              {scaleMode === "proportional" ? (
                <div>
                  <label className="text-[11px] text-muted-foreground">Target yield ({recipe.targetYield.unit})</label>
                  <input type="number" value={scaleTarget} step="1" onChange={(e) => setScaleTarget(Number(e.target.value) || 0)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1 font-mono text-sm" />
                  <input type="range" min={recipe.targetYield.value * 0.1} max={recipe.targetYield.value * 5} step="1" value={scaleTarget}
                    onChange={(e) => setScaleTarget(Number(e.target.value))} className="mt-2 w-full accent-primary" />
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

            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Compliance snapshot</div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Hazards</span><span>{recipe.compliance.hazards.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Allergens</span><span>{recipe.compliance.allergens.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Storage ≤</span><span>{recipe.compliance.storageMaxC}°C</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shelf life</span><span>{recipe.compliance.shelfLifeDays} d</span></div>
              </div>
            </div>

            <button disabled={locked} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-40">
              <Save className="h-4 w-4" /> Save draft
            </button>
            <p className="text-center text-[10px] text-muted-foreground">Acting as <span className="text-primary">{role}</span></p>
          </div>
        </aside>
      </div>

      {/* Item dialog */}
      <EntityFormDialog<Partial<RecipeItem>>
        open={addingItem || !!editingItem}
        onClose={() => { setAddingItem(false); setEditingItem(null); }}
        title={editingItem ? `Edit ${editingItem.name}` : "Add component"}
        fields={itemFields}
        initial={editingItem ?? { refType: "material", scaling: "proportional", targetPct: 0, minPct: 0, maxPct: 100, unit: "kg" }}
        onSubmit={(v: any) => {
          const payload = {
            refType: v.refType, refId: v.refId, name: v.name,
            targetPct: Number(v.targetPct), minPct: Number(v.minPct), maxPct: Number(v.maxPct),
            unit: v.unit, scaling: v.scaling,
          };
          if (editingItem) updateRecipeItem(recipe.id, editingItem.id, payload);
          else addRecipeItem(recipe.id, payload);
        }}
      />
      <ConfirmDialog
        open={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => deleteItemId && removeRecipeItem(recipe.id, deleteItemId)}
        title="Remove component?"
        message="This deletes the row from the current recipe version only."
      />

      {/* Step dialog */}
      <EntityFormDialog<Partial<ProcessStep>>
        open={addingStep || !!editingStep}
        onClose={() => { setAddingStep(false); setEditingStep(null); }}
        title={editingStep ? `Edit step ${editingStep.seq}` : "Add process step"}
        fields={stepFields}
        initial={editingStep ?? { unit: "°C", durationMin: 15 }}
        onSubmit={(v: any) => {
          const payload = { phase: v.phase, parameter: v.parameter, targetValue: Number(v.targetValue), unit: v.unit, durationMin: Number(v.durationMin) };
          if (editingStep) updateProcessStep(recipe.id, editingStep.seq, payload);
          else addProcessStep(recipe.id, payload);
        }}
      />
      <ConfirmDialog
        open={deleteStepSeq !== null}
        onClose={() => setDeleteStepSeq(null)}
        onConfirm={() => deleteStepSeq !== null && removeProcessStep(recipe.id, deleteStepSeq)}
        title="Remove process step?"
        message="Sequence numbers will re-index automatically."
      />

      {/* Meta dialog */}
      <EntityFormDialog
        open={editingMeta}
        onClose={() => setEditingMeta(false)}
        title="Edit recipe details"
        fields={metaFields}
        initial={{
          name: recipe.name, code: recipe.code, version: recipe.version, project: recipe.project,
          branchLabel: recipe.branchLabel ?? "", classification: recipe.classification,
          targetYieldValue: recipe.targetYield.value, targetYieldUnit: recipe.targetYield.unit,
          storageMaxC: recipe.compliance.storageMaxC, shelfLifeDays: recipe.compliance.shelfLifeDays,
          hazards: recipe.compliance.hazards, allergens: recipe.compliance.allergens,
        }}
        onSubmit={(v: any) => {
          updateRecipe(recipe.id, {
            name: v.name, code: v.code, version: v.version, project: v.project,
            branchLabel: v.branchLabel || undefined, classification: v.classification,
            targetYield: { value: Number(v.targetYieldValue), unit: v.targetYieldUnit },
            compliance: {
              ...recipe.compliance,
              storageMaxC: Number(v.storageMaxC), shelfLifeDays: Number(v.shelfLifeDays),
              hazards: v.hazards ?? [], allergens: v.allergens ?? [],
            },
          } as Partial<Recipe>);
        }}
      />
      <ConfirmDialog
        open={deleteRecipeOpen}
        onClose={() => setDeleteRecipeOpen(false)}
        onConfirm={() => { deleteRecipe(recipe.id); navigate({ to: "/recipes" }); }}
        title="Delete recipe?"
        message="This permanently removes the recipe. Trials referencing it will remain but lose their live link."
      />
    </div>
  );
}
