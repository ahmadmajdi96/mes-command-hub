import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, AlertTriangle, Square, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import type { ExecutionRecord } from "@/lib/rms-data";

export const Route = createFileRoute("/run/$id")({
  head: ({ params }) => ({ meta: [
    { title: `Batch run ${params.id} · Cortanex RMS` },
    { name: "description", content: "Step-by-step guided execution of a released recipe with actual values and deviations." },
    { property: "og:title", content: "Batch run · Cortanex RMS" },
    { property: "og:description", content: "Guided batch execution with actual-versus-target recording." },
  ] }),
  component: RunPage,
});

type Step = NonNullable<ExecutionRecord["steps"]>[number];
const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");

function RunPage() {
  const { id } = Route.useParams();
  const { executions, recipes, updateExecution, can } = useRms();
  const ex = executions.find((e) => e.id === id);
  const recipe = ex ? recipes.find((r) => r.id === ex.recipeId) : undefined;
  const [steps, setSteps] = useState<Step[]>([]);
  const [actualQty, setActualQty] = useState<Record<string, string>>({});
  const [finalYield, setFinalYield] = useState("");
  const [abortReason, setAbortReason] = useState("");

  useEffect(() => {
    if (!ex) return;
    if (ex.steps?.length) setSteps(ex.steps);
    else if (recipe) setSteps(recipe.process.map((p) => ({ seq: p.seq, phase: p.phase, parameter: p.parameter, target: p.targetValue, actual: null, unit: p.unit })));
  }, [ex?.id, recipe?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ex) return <div className="text-sm text-muted-foreground">Execution not found. <Link to="/execution" className="text-primary">Back</Link></div>;
  const editable = ex.status === "running" && can("execution.record");
  const current = steps.find((s) => !s.doneAt);
  const tolerance = 0.05;

  const saveSteps = (next: Step[]) => { setSteps(next); updateExecution(ex.id, { steps: next }); };
  const confirmStep = (s: Step, actual: number, deviation: string) => {
    const off = s.target ? Math.abs(actual - s.target) / Math.abs(s.target) : 0;
    if (off > tolerance && !deviation.trim()) return toast.error(`Actual is ${(off * 100).toFixed(1)}% off target — describe the deviation`);
    saveSteps(steps.map((x) => x.seq === s.seq ? { ...x, actual, deviation: deviation || undefined, doneAt: now() } : x));
    toast.success(`Step ${s.seq} recorded`);
  };

  const complete = () => {
    if (steps.some((s) => !s.doneAt)) return toast.error("Complete all steps first");
    if (!finalYield) return toast.error("Enter the actual yield");
    updateExecution(ex.id, { status: "completed", finishedAt: now(), actualYield: Number(finalYield), steps,
      notes: [ex.notes, ...Object.entries(actualQty).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).join(" · ") });
    toast.success("Batch completed · QC sample requested from CORTA QC");
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Link to="/execution" className="hover:text-primary">Production</Link><ChevronRight className="h-3 w-3" />{ex.id}</div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold">{ex.recipeCode} <span className="font-mono text-base text-muted-foreground">{ex.version}</span></h1>
          <div className="flex gap-2"><StatusPill status={ex.status} /><StatusPill status={ex.qcStatus} /></div>
        </div>
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
          <div><span className="text-muted-foreground">Order</span><div className="font-mono">{ex.productionOrder}</div></div>
          <div><span className="text-muted-foreground">Batch</span><div className="font-mono">{ex.batch}</div></div>
          <div><span className="text-muted-foreground">Equipment</span><div>{ex.equipment} · {ex.line}</div></div>
          <div><span className="text-muted-foreground">Operator</span><div>{ex.operator} · {ex.startedAt}</div></div>
        </div>
        {!editable && <p className="mt-3 flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> {ex.status === "running" ? "Only operators can record this batch." : "This batch is closed and locked."}</p>}
      </div>

      {recipe && (
        <div className="glass-panel overflow-x-auto rounded-2xl p-5">
          <h3 className="text-sm font-semibold">1 · Weigh / charge materials</h3>
          <table className="mt-2 w-full text-sm">
            <thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th className="py-2 pr-3">Material</th><th className="pr-3">Target qty</th><th className="pr-3">Allowed</th><th className="pr-3">Actual</th></tr></thead>
            <tbody>{recipe.items.map((i) => {
              const target = recipe.targetYield.value * i.targetPct / 100;
              const lo = recipe.targetYield.value * i.minPct / 100, hi = recipe.targetYield.value * i.maxPct / 100;
              const v = Number(actualQty[i.name]);
              const out = actualQty[i.name] && (v < lo || v > hi);
              return (
                <tr key={i.id} className="border-t border-border/40">
                  <td className="py-2 pr-3">{i.name}</td>
                  <td className="pr-3 font-mono text-xs">{target.toFixed(3)} {i.unit}</td>
                  <td className="pr-3 font-mono text-xs text-muted-foreground">{lo.toFixed(3)}–{hi.toFixed(3)}</td>
                  <td className="pr-3"><input disabled={!editable} type="number" step="0.001" value={actualQty[i.name] ?? ""} onChange={(e) => setActualQty({ ...actualQty, [i.name]: e.target.value })}
                    className={`h-8 w-28 rounded border bg-card/60 px-2 font-mono text-xs ${out ? "border-destructive text-destructive" : "border-border/60"}`} />{out && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold">2 · Process steps</h3>
        <ol className="mt-3 space-y-2">
          {steps.length === 0 && <p className="text-xs text-muted-foreground">This recipe has no process steps.</p>}
          {steps.map((s) => <StepRow key={s.seq} s={s} active={editable && current?.seq === s.seq} onConfirm={confirmStep} />)}
        </ol>
      </div>

      {editable && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-panel space-y-2 rounded-2xl p-5">
            <h3 className="text-sm font-semibold">3 · Complete batch</h3>
            <input type="number" step="0.01" value={finalYield} onChange={(e) => setFinalYield(e.target.value)} placeholder={`Actual yield (${recipe?.targetYield.unit ?? ""})`} className="h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm" />
            <button onClick={complete} className="inline-flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Complete &amp; sign off</button>
          </div>
          <div className="glass-panel space-y-2 rounded-2xl p-5">
            <h3 className="text-sm font-semibold">Abort batch</h3>
            <input value={abortReason} onChange={(e) => setAbortReason(e.target.value)} placeholder="Reason (required)" className="h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm" />
            <button onClick={() => { if (!abortReason.trim()) return toast.error("Reason required"); updateExecution(ex.id, { status: "aborted", finishedAt: now(), notes: `Aborted: ${abortReason}`, steps }); }} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"><Square className="h-3.5 w-3.5" /> Abort</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ s, active, onConfirm }: { s: Step; active: boolean; onConfirm: (s: Step, actual: number, deviation: string) => void }) {
  const [val, setVal] = useState(s.actual?.toString() ?? "");
  const [dev, setDev] = useState(s.deviation ?? "");
  return (
    <li className={`rounded-xl border p-3 text-sm ${s.doneAt ? "border-success/40 bg-success/5" : active ? "border-primary/50 bg-primary/5" : "border-border/50 opacity-70"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><span className="font-mono text-xs text-muted-foreground">#{s.seq}</span> <span className="font-medium">{s.phase}</span> · {s.parameter} target <span className="font-mono">{s.target} {s.unit}</span></div>
        {s.doneAt && <span className="text-xs text-success">✓ {s.actual} {s.unit} · {s.doneAt}{s.deviation ? ` · deviation: ${s.deviation}` : ""}</span>}
      </div>
      {active && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Actual" className="h-8 w-28 rounded border border-border/60 bg-card/60 px-2 font-mono text-xs" />
          <input value={dev} onChange={(e) => setDev(e.target.value)} placeholder="Deviation note (if off target)" className="h-8 flex-1 rounded border border-border/60 bg-card/60 px-2 text-xs" />
          <button onClick={() => val !== "" && onConfirm(s, Number(val), dev)} className="rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">Confirm step</button>
        </div>
      )}
    </li>
  );
}
