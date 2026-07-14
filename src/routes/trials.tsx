import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { Beaker, Plus, Save } from "lucide-react";

export const Route = createFileRoute("/trials")({
  head: () => ({ meta: [{ title: "Research Trial Logs · Cortanex RMS" }, { name: "description", content: "Structured lab notebook capturing bench execution and fail-state history." }] }),
  component: Trials,
});

function Trials() {
  const { trials, recipes, addTrial } = useRms();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipeId: recipes[0].id, batchCode: "", operator: "", observation: "", outcome: "pass" as const, color: 7, smell: 7, texture: 7 });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Research Trial Logs</h1>
          <p className="text-sm text-muted-foreground">Real-time bench observations. Fail-state entries stay searchable for audit.</p>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New trial entry
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => { e.preventDefault(); const r = recipes.find((rr) => rr.id === form.recipeId)!; addTrial({ recipeId: r.id, recipeName: `${r.name} ${r.version}`, batchCode: form.batchCode || "LAB-XX-0000", operator: form.operator || "—", observation: form.observation, outcome: form.outcome, sensory: { color: form.color, smell: form.smell, texture: form.texture }, analytics: [] }); setOpen(false); }}
          className="glass-panel space-y-3 rounded-2xl p-5"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs">Recipe
              <select value={form.recipeId} onChange={(e) => setForm({ ...form, recipeId: e.target.value })} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.name} {r.version}</option>)}
              </select>
            </label>
            <label className="text-xs">Batch code
              <input value={form.batchCode} onChange={(e) => setForm({ ...form, batchCode: e.target.value })} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs">Operator
              <input value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs">Outcome
              <select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value as any })} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </label>
          </div>
          <label className="block text-xs">Observation
            <textarea rows={3} value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm" placeholder="e.g. Batch separated at 40°C." />
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["color", "smell", "texture"] as const).map((k) => (
              <label key={k} className="text-xs capitalize">{k}: <span className="font-mono">{form[k]}</span>
                <input type="range" min={1} max={10} value={form[k]} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) } as any)} className="mt-1 w-full accent-primary" />
              </label>
            ))}
          </div>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Save className="h-3.5 w-3.5" /> Log trial</button>
        </form>
      )}

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
              <StatusPill status={t.outcome} />
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
    </div>
  );
}
