import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useRms } from "@/lib/rms-store";
import { Search, Plus, LayoutGrid, Rows3, Package, Droplets, Flame, Atom, DollarSign, Pencil, Trash2 } from "lucide-react";
import type { Material } from "@/lib/rms-data";
import { EntityFormDialog, ConfirmDialog, type FieldSpec } from "@/components/entity-form-dialog";

export const Route = createFileRoute("/materials")({
  head: () => ({ meta: [{ title: "Material Catalog · Cortanex RMS" }, { name: "description", content: "Master raw material catalog with user-defined attribute schemas." }] }),
  component: Materials,
});

const stateIcon = (s: Material["physicalState"]) =>
  s === "Liquid" ? Droplets : s === "Powder" ? Atom : s === "Gas" ? Flame : Package;

const stateTone = (s: Material["physicalState"]) =>
  s === "Liquid" ? "text-info" : s === "Powder" ? "text-accent" : s === "Gas" ? "text-warning" : "text-primary";

function Materials() {
  const { materials, schemas, units, addMaterial, updateMaterial, deleteMaterial } = useRms();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [editing, setEditing] = useState<Material | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const cats = Array.from(new Set(materials.map((m) => m.category)));
  const filtered = materials.filter((m) =>
    (cat === "all" || m.category === cat) &&
    (q === "" || (m.name + m.id + m.category).toLowerCase().includes(q.toLowerCase()))
  );

  const stats = {
    total: materials.length,
    categories: cats.length,
    avgCost: materials.length ? materials.reduce((a, m) => a + m.baseCost, 0) / materials.length : 0,
    suppliers: new Set(materials.map((m) => m.supplier).filter(Boolean)).size,
  };

  const fields = useMemo<FieldSpec[]>(() => [
    { key: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Sodium Lauryl Sulfate" },
    { key: "category", label: "Category", type: "text", required: true, placeholder: "e.g. Surfactant" },
    { key: "physicalState", label: "Physical state", type: "select", required: true, options: [
      { value: "Solid", label: "Solid" }, { value: "Liquid", label: "Liquid" },
      { value: "Powder", label: "Powder" }, { value: "Gas", label: "Gas" },
    ] },
    { key: "unit", label: "Base unit", type: "select", required: true, options: units.map((u) => ({ value: u.symbol, label: `${u.symbol} — ${u.name}` })) },
    { key: "baseCost", label: "Base cost", type: "number", required: true, step: 0.01, help: "Cost per base unit" },
    { key: "supplier", label: "Supplier", type: "text" },
    { key: "schemaId", label: "Attribute schema", type: "select", required: true, options: schemas.map((s) => ({ value: s.id, label: `${s.name} · ${s.domain}` })) },
    { key: "attrs", label: "Custom attributes", type: "kv", help: "Key-value pairs matching the schema" },
  ], [schemas, units]);

  const submit = (v: any) => {
    const payload = { ...v, baseCost: Number(v.baseCost) || 0, attrs: v.attrs ?? {} };
    if (editing) updateMaterial(editing.id, payload);
    else addMaterial(payload);
    setEditing(null); setCreating(false);
  };

  return (
    <div className="space-y-5">
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Raw material master</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Material Catalog</h1>
            <p className="mt-1 text-sm text-muted-foreground">Generic raw components with user-defined attribute schemas.</p>
          </div>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Add material
          </button>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Materials", value: stats.total, icon: Package, tone: "text-primary" },
            { label: "Categories", value: stats.categories, icon: Atom, tone: "text-info" },
            { label: "Avg base cost", value: `$${stats.avgCost.toFixed(2)}`, icon: DollarSign, tone: "text-accent" },
            { label: "Suppliers", value: stats.suppliers, icon: Package, tone: "text-success" },
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

      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search materials by name, ID, category…" value={q} onChange={(e) => setQ(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/60 bg-card/60 pl-8 pr-3 text-sm focus:border-primary/50 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("all")} className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${cat === "all" ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>all</button>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${cat === c ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>{c}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 p-0.5">
          <button onClick={() => setView("grid")} className={`grid h-7 w-7 place-items-center rounded ${view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
          <button onClick={() => setView("table")} className={`grid h-7 w-7 place-items-center rounded ${view === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}><Rows3 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {view === "grid" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const sch = schemas.find((s) => s.id === m.schemaId);
            const Icon = stateIcon(m.physicalState);
            const tone = stateTone(m.physicalState);
            return (
              <div key={m.id} className="glass-panel group rounded-2xl p-4 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-card/60 ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.id}</div>
                      <div className="truncate text-sm font-semibold">{m.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{m.category} · {m.physicalState}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-accent">${m.baseCost.toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">per {m.unit}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(m.attrs).slice(0, 4).map(([k, v]) => (
                    <span key={k} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{k}: {String(v)}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                  <span>Schema: <span className="text-foreground">{sch?.name}</span></span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(m)} className="rounded p-1 hover:bg-muted/40 hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => setDeleteId(m.id)} className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "table" && (
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-4 pr-3 font-medium">ID</th>
                <th className="py-3 pr-3 font-medium">Name</th>
                <th className="py-3 pr-3 font-medium">Category</th>
                <th className="py-3 pr-3 font-medium">State</th>
                <th className="py-3 pr-3 font-medium">Schema</th>
                <th className="py-3 pr-3 font-medium text-right">Base cost</th>
                <th className="py-3 pr-3 font-medium">Custom attrs</th>
                <th className="py-3 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const sch = schemas.find((s) => s.id === m.schemaId);
                const tone = stateTone(m.physicalState);
                return (
                  <tr key={m.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="py-3 pl-4 pr-3 font-mono text-xs text-muted-foreground">{m.id}</td>
                    <td className="py-3 pr-3 font-medium">{m.name}</td>
                    <td className="py-3 pr-3"><span className="rounded bg-muted/40 px-1.5 py-0.5 text-[11px]">{m.category}</span></td>
                    <td className={`py-3 pr-3 text-xs ${tone}`}>{m.physicalState}</td>
                    <td className="py-3 pr-3 text-[11px] text-muted-foreground">{sch?.name}</td>
                    <td className="py-3 pr-3 text-right font-mono text-accent">${m.baseCost.toFixed(2)}/{m.unit}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(m.attrs).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">{k}:{String(v)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(m)} className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteId(m.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EntityFormDialog<Partial<Material>>
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? `Edit ${editing.name}` : "New material"}
        subtitle="Attributes conform to the selected schema."
        fields={fields}
        initial={editing ?? { physicalState: "Liquid", unit: units[0]?.symbol, schemaId: schemas[0]?.id, attrs: {} }}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMaterial(deleteId)}
        title="Delete material?"
        message="This permanently removes the material from the catalog. Recipes referencing it will keep their historical entries."
      />
    </div>
  );
}
