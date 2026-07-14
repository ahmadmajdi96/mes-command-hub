import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { Beaker, Plus, Pencil, Trash2 } from "lucide-react";
import { EntityFormDialog, ConfirmDialog, type FieldSpec } from "@/components/entity-form-dialog";
import type { Trial } from "@/lib/rms-data";

export const Route = createFileRoute("/trials")({
  head: () => ({ meta: [{ title: "Research Trial Logs · Cortanex RMS" }, { name: "description", content: "Structured lab notebook capturing bench execution and fail-state history." }] }),
  component: Trials,
});

function Trials() {
  const { trials, recipes, addTrial, updateTrial, deleteTrial } = useRms();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Trial | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields = useMemo<FieldSpec[]>(() => [
    { key: "recipeId", label: "Recipe", type: "select", required: true, options: recipes.map((r) => ({ value: r.id, label: `${r.name} ${r.version}` })) },
    { key: "batchCode", label: "Batch code", type: "text", required: true, placeholder: "LAB-24-0812" },
    { key: "operator", label: "Operator", type: "text", required: true },
    { key: "outcome", label: "Outcome", type: "select", required: true, options: [
      { value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }, { value: "inconclusive", label: "Inconclusive" },
    ] },
    { key: "observation", label: "Observation", type: "textarea", required: true, placeholder: "e.g. Batch separated at 40°C after 12 min mixing." },
    { key: "color", label: "Color (1–10)", type: "number", min: 1, max: 10, step: 1 },
    { key: "smell", label: "Smell (1–10)", type: "number", min: 1, max: 10, step: 1 },
    { key: "texture", label: "Texture (1–10)", type: "number", min: 1, max: 10, step: 1 },
  ], [recipes]);

  const submit = (v: any) => {
    const r = recipes.find((rr) => rr.id === v.recipeId)!;
    const payload = {
      recipeId: r.id, recipeName: `${r.name} ${r.version}`,
      batchCode: v.batchCode, operator: v.operator, observation: v.observation, outcome: v.outcome,
      sensory: { color: Number(v.color) || 5, smell: Number(v.smell) || 5, texture: Number(v.texture) || 5 },
      analytics: [] as { key: string; value: number; unit: string }[],
    };
    if (editing) updateTrial(editing.id, payload);
    else addTrial(payload);
    setCreating(false); setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Research Trial Logs</h1>
          <p className="text-sm text-muted-foreground">Real-time bench observations. Fail-state entries stay searchable for audit.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New trial entry
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {trials.map((t) => (
          <div key={t.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <Beaker className="h-3 w-3" /> {t.id} · {t.batchCode}
                </div>
                <Link to="/recipes/$id" params={{ id: t.recipeId }} className="mt-1 block text-sm font-semibold hover:underline">{t.recipeName}</Link>
              </div>
              <div className="flex items-center gap-1">
                <StatusPill status={t.outcome} />
                <button onClick={() => setEditing(t)} className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteId(t.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.observation}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["color", "smell", "texture"] as const).map((k) => (
                <div key={k} className="rounded-md bg-muted/30 p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="font-mono text-sm font-semibold">{t.sensory[k]}/10</div>
                </div>
              ))}
            </div>
            {t.analytics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.analytics.map((a, i) => (
                  <span key={i} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{a.key}: {a.value}{a.unit}</span>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{t.operator}</span>
              <span className="font-mono">{t.loggedAt}</span>
            </div>
          </div>
        ))}
      </div>

      <EntityFormDialog
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? `Edit ${editing.id}` : "New trial entry"}
        fields={fields}
        initial={editing ? {
          recipeId: editing.recipeId, batchCode: editing.batchCode, operator: editing.operator,
          outcome: editing.outcome, observation: editing.observation,
          color: editing.sensory.color, smell: editing.sensory.smell, texture: editing.sensory.texture,
        } : { recipeId: recipes[0]?.id, outcome: "pass", color: 7, smell: 7, texture: 7 }}
        onSubmit={submit}
        submitLabel={editing ? "Save" : "Log trial"}
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTrial(deleteId)}
        title="Delete trial log?"
        message="This removes the entry from the notebook — regulatory audits may reference it."
      />
    </div>
  );
}
