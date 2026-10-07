import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, ShieldCheck, Lock } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { validateRecipe, type RuleKind } from "@/lib/rms-data";
import { StatusPill } from "@/components/status-pill";
import { EntityFormDialog, type FieldSpec } from "@/components/entity-form-dialog";

export const Route = createFileRoute("/validation")({
  head: () => ({ meta: [
    { title: "Validation Rules · Cortanex RMS" },
    { name: "description", content: "Configurable recipe validation rules: required parameters, limits, data types, steps, references and equipment compatibility." },
    { property: "og:title", content: "Validation Rules · Cortanex RMS" },
    { property: "og:description", content: "Configure the rules every recipe must pass before submission, approval and release." },
  ] }),
  component: ValidationPage,
});

const KINDS: { value: RuleKind; label: string }[] = [
  { value: "required_param", label: "Required parameter" },
  { value: "min_max", label: "Min / max limits" },
  { value: "data_type", label: "Data type check" },
  { value: "required_step", label: "Required process step" },
  { value: "required_ref", label: "Required reference" },
  { value: "sum_100", label: "Composition = 100%" },
  { value: "equipment_compat", label: "Equipment compatibility" },
];

function ValidationPage() {
  const { rules, addRule, updateRule, deleteRule, recipes, materials, can } = useRms();
  const [adding, setAdding] = useState(false);
  const editable = can("validation.configure");

  const fields = useMemo<FieldSpec[]>(() => [
    { key: "name", label: "Rule name", type: "text", required: true },
    { key: "kind", label: "Rule type", type: "select", required: true, options: KINDS },
    { key: "severity", label: "Severity", type: "select", required: true, options: [{ value: "error", label: "Error (blocks workflow)" }, { value: "warning", label: "Warning" }] },
    { key: "config", label: "Parameters", type: "keyvalue" },
  ], []);

  const results = recipes.map((r) => ({ r, issues: validateRecipe(r, rules, materials, recipes) }));

  return (
    <div className="space-y-5">
      <div className="glass-panel flex flex-wrap items-end justify-between gap-4 rounded-2xl p-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Recipe governance</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Validation Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">Error-level rules block submission, approval and release. Configured by the RMS Administrator.</p>
        </div>
        {editable ? (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"><Plus className="h-3.5 w-3.5" /> New rule</button>
        ) : <span className="inline-flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> Read-only for your role</span>}
      </div>

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pl-4 pr-3">ID</th><th className="pr-3">Rule</th><th className="pr-3">Type</th><th className="pr-3">Parameters</th><th className="pr-3">Severity</th><th className="pr-3">Enabled</th><th></th>
          </tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="py-3 pl-4 pr-3 font-mono text-xs text-primary">{r.id}</td>
                <td className="pr-3 font-medium">{r.name}</td>
                <td className="pr-3 text-xs text-muted-foreground">{KINDS.find((k) => k.value === r.kind)?.label}</td>
                <td className="pr-3 font-mono text-[11px] text-muted-foreground">{Object.entries(r.config).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}</td>
                <td className="pr-3">
                  <select disabled={!editable} value={r.severity} onChange={(e) => updateRule(r.id, { severity: e.target.value as "error" | "warning" })}
                    className="rounded border border-border/60 bg-card/60 px-1.5 py-0.5 text-xs">
                    <option value="error">error</option><option value="warning">warning</option>
                  </select>
                </td>
                <td className="pr-3"><input type="checkbox" disabled={!editable} checked={r.enabled} onChange={(e) => updateRule(r.id, { enabled: e.target.checked })} className="accent-[var(--primary)]" /></td>
                <td className="pr-3">{editable && <button onClick={() => deleteRule(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Live results across repository</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {results.map(({ r, issues }) => {
            const e = issues.filter((i) => i.severity === "error").length;
            return (
              <div key={r.id} className={`rounded-xl border p-3 text-xs ${e ? "border-destructive/40 bg-destructive/5" : issues.length ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5"}`}>
                <div className="flex items-center justify-between"><span className="font-medium">{r.code} {r.version}</span><StatusPill status={r.status} /></div>
                <div className="mt-1 text-muted-foreground">{e} errors · {issues.length - e} warnings</div>
                {issues.slice(0, 2).map((i, idx) => <div key={idx} className="mt-1 truncate text-[11px]">• {i.message}</div>)}
              </div>
            );
          })}
        </div>
      </div>

      <EntityFormDialog open={adding} onOpenChange={setAdding} title="New validation rule" fields={fields}
        initial={{ kind: "required_param", severity: "error", config: {} }}
        onSubmit={(v) => { addRule({ name: v.name, kind: v.kind, severity: v.severity, enabled: true, config: v.config ?? {} }); setAdding(false); }} />
    </div>
  );
}
