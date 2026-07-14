import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, LayoutGrid, Rows3, FlaskConical, TrendingUp, Layers, DollarSign, Trash2 } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { recipeCost, groupedProjects, statusLabel, type RecipeStatus } from "@/lib/rms-data";
import { EntityFormDialog, ConfirmDialog, type FieldSpec } from "@/components/entity-form-dialog";

export const Route = createFileRoute("/recipes/")({
  head: () => ({ meta: [{ title: "Recipes · Cortanex RMS" }, { name: "description", content: "Browse and open recipes across R&D projects." }] }),
  component: RecipesPage,
});

const STATUS_FILTERS: ("all" | RecipeStatus)[] = ["all", "draft", "review", "regulatory", "costing", "released", "abandoned"];

function RecipesPage() {
  const navigate = useNavigate();
  const { recipes, materials, addRecipe, deleteRecipe } = useRms();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RecipeStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields = useMemo<FieldSpec[]>(() => [
    { key: "name", label: "Recipe name", type: "text", required: true, placeholder: "e.g. Solvent-Free Sealant" },
    { key: "code", label: "Code", type: "text", required: true, placeholder: "SEAL-V1" },
    { key: "version", label: "Version", type: "text", required: true, placeholder: "v1.0" },
    { key: "project", label: "Project", type: "text", required: true },
    { key: "classification", label: "Classification", type: "text", required: true, placeholder: "e.g. Industrial Coating" },
    { key: "branchLabel", label: "Branch label", type: "text", placeholder: "Baseline / Variant A" },
    { key: "targetYieldValue", label: "Target yield", type: "number", required: true, step: 0.01 },
    { key: "targetYieldUnit", label: "Yield unit", type: "text", required: true, placeholder: "kg / L" },
    { key: "status", label: "Initial status", type: "select", required: true, options: [
      { value: "draft", label: "Draft" }, { value: "review", label: "Peer Review" },
    ] },
    { key: "createdBy", label: "Created by", type: "text", required: true },
  ], []);

  const filtered = useMemo(() => recipes.filter((r) =>
    (status === "all" || r.status === status) &&
    (q === "" || (r.name + r.code + r.project + (r.branchLabel ?? "")).toLowerCase().includes(q.toLowerCase()))
  ), [recipes, status, q]);

  const groups = groupedProjects(filtered);

  const stats = {
    total: recipes.length,
    released: recipes.filter((r) => r.status === "released").length,
    inFlight: recipes.filter((r) => ["review", "regulatory", "costing"].includes(r.status)).length,
    avgCost: recipes.length ? recipes.reduce((a, r) => a + recipeCost(r, materials), 0) / recipes.length : 0,
  };

  const countFor = (s: "all" | RecipeStatus) => s === "all" ? recipes.length : recipes.filter((r) => r.status === s).length;

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Formulation library</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Recipes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Multi-level formulas with proportional or fixed scaling across every active R&amp;D project.</p>
          </div>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New draft
          </button>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total recipes", value: stats.total, icon: FlaskConical, tone: "text-primary" },
            { label: "Released", value: stats.released, icon: TrendingUp, tone: "text-success" },
            { label: "In workflow", value: stats.inFlight, icon: Layers, tone: "text-info" },
            { label: "Avg. cost", value: `$${stats.avgCost.toFixed(0)}`, icon: DollarSign, tone: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <s.icon className={`h-3.5 w-3.5 ${s.tone}`} />
              </div>
              <div className="mt-1 font-mono text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search by name, code, project, branch…" value={q} onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/60 bg-card/60 pl-8 pr-3 text-sm focus:border-primary/50 focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider transition ${status === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "All" : statusLabel(s)}
              <span className="rounded bg-background/60 px-1 font-mono text-[10px]">{countFor(s)}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 p-0.5">
          <button onClick={() => setView("grid")} className={`grid h-7 w-7 place-items-center rounded ${view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`} aria-label="Grid view"><LayoutGrid className="h-3.5 w-3.5" /></button>
          <button onClick={() => setView("list")} className={`grid h-7 w-7 place-items-center rounded ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`} aria-label="List view"><Rows3 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-muted-foreground">
          <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <div className="mt-2">No recipes match your filters.</div>
        </div>
      )}

      {view === "grid" && groups.map(({ project, items }) => (
        <div key={project} className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{project}</h3>
              <div className="text-[11px] text-muted-foreground">{items.length} recipes · {items.filter((r) => r.status === "released").length} released</div>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{items.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((r) => {
              const cost = recipeCost(r, materials);
              const totalPct = r.items.reduce((a, it) => a + it.targetPct, 0);
              return (
                <Link key={r.id} to="/recipes/$id" params={{ id: r.id }}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/50 hover:bg-card/70 hover:shadow-lg hover:shadow-primary/5">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-info/0 opacity-0 transition group-hover:opacity-100" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.code} · {r.version}</div>
                      <div className="mt-0.5 truncate text-sm font-semibold">{r.name}</div>
                      {r.branchLabel && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded bg-info/10 px-1.5 py-0.5 text-[10px] text-info">↳ {r.branchLabel}</div>
                      )}
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
                      <div className="font-mono text-xs font-medium">${cost.toFixed(0)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Σ target</span>
                    <span className={`font-mono ${totalPct === 100 ? "text-success" : "text-warning"}`}>{totalPct.toFixed(2)}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/40">
                    <div className={`h-full ${totalPct === 100 ? "bg-success" : "bg-warning"}`} style={{ width: `${Math.min(totalPct, 100)}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {view === "list" && (
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-4 pr-3 font-medium">Code</th>
                <th className="py-3 pr-3 font-medium">Recipe</th>
                <th className="py-3 pr-3 font-medium">Project</th>
                <th className="py-3 pr-3 font-medium">Status</th>
                <th className="py-3 pr-3 font-medium text-right">Yield</th>
                <th className="py-3 pr-3 font-medium text-right">Items</th>
                <th className="py-3 pr-4 font-medium text-right">Cost</th>
                <th className="py-3 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="py-2.5 pl-4 pr-3 font-mono text-[11px] text-muted-foreground">{r.code}</td>
                  <td className="py-2.5 pr-3">
                    <Link to="/recipes/$id" params={{ id: r.id }} className="font-medium hover:text-primary">{r.name}</Link>
                    <div className="text-[10px] text-muted-foreground">{r.version} {r.branchLabel ? `· ${r.branchLabel}` : ""}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.project}</td>
                  <td className="py-2.5 pr-3"><StatusPill status={r.status} /></td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs">{r.targetYield.value}{r.targetYield.unit}</td>
                  <td className="py-2.5 pr-3 text-right font-mono text-xs">{r.items.length}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs">${recipeCost(r, materials).toFixed(0)}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <button onClick={() => setDeleteId(r.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EntityFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New recipe draft"
        subtitle="Add components and process steps after creating the recipe."
        fields={fields}
        initial={{ status: "draft", targetYieldValue: 1000, targetYieldUnit: "kg", createdBy: "M. Fahad" }}
        onSubmit={(v: any) => {
          const id = `REC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          addRecipe({
            id, code: v.code, name: v.name, version: v.version, project: v.project,
            classification: v.classification, branchLabel: v.branchLabel || undefined,
            status: v.status, createdBy: v.createdBy,
            targetYield: { value: Number(v.targetYieldValue), unit: v.targetYieldUnit },
            compliance: { hazards: [], allergens: [], storageMaxC: 25, shelfLifeDays: 180 },
          } as any);
          setCreating(false);
        }}
        submitLabel="Create draft"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteRecipe(deleteId)}
        title="Delete recipe?"
        message="This permanently removes the recipe and its variant chain link."
      />
    </div>
  );
}
