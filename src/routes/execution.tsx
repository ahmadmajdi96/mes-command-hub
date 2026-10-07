import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Play, CheckCircle2, Factory, Lock, Square } from "lucide-react";
import { toast } from "sonner";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { EntityFormDialog, type FieldSpec } from "@/components/entity-form-dialog";

export const Route = createFileRoute("/execution")({
  head: () => ({ meta: [
    { title: "Production Execution · Cortanex RMS" },
    { name: "description", content: "Released recipes available for production; dispatch to MES and record execution data." },
    { property: "og:title", content: "Production Execution · Cortanex RMS" },
    { property: "og:description", content: "Operators execute only released recipes and record batch execution data." },
  ] }),
  component: ExecutionPage,
});

function ExecutionPage() {
  const { recipes, executions, addExecution, updateExecution, can, actor } = useRms();
  const released = recipes.filter((r) => r.status === "released");
  const [startFor, setStartFor] = useState<string | null>(null);
  const [finish, setFinish] = useState<string | null>(null);
  const canExec = can("recipe.execute");
  const canRecord = can("execution.record");

  const startFields = useMemo<FieldSpec[]>(() => [
    { key: "productionOrder", label: "Production order", type: "text", required: true, placeholder: "PO-26-xxxx" },
    { key: "batch", label: "Batch / lot", type: "text", required: true },
    { key: "equipment", label: "Equipment", type: "select", required: true, options: ["Mixer MX-02", "Mixer MX-04", "Reactor R-11", "Kettle K-03"].map((v) => ({ value: v, label: v })) },
    { key: "line", label: "Line", type: "select", required: true, options: ["Line 1", "Line 2", "Line 3"].map((v) => ({ value: v, label: v })) },
    { key: "source", label: "Dispatch via", type: "select", required: true, options: [{ value: "MES", label: "MES Command Center" }, { value: "Manual", label: "Manual / paper" }] },
  ], []);
  const finishFields = useMemo<FieldSpec[]>(() => [
    { key: "actualYield", label: "Actual yield", type: "number", required: true, step: 0.01 },
    { key: "notes", label: "Execution notes / deviations", type: "textarea" },
  ], []);

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Shop floor</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Production Execution</h1>
        <p className="mt-1 text-sm text-muted-foreground">Only <span className="text-success">Released</span> recipes are available for execution and download. Executions are pushed from / to MES Command Center.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {released.length === 0 && <p className="text-sm text-muted-foreground">No released recipes.</p>}
        {released.map((r) => (
          <div key={r.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between"><span className="font-mono text-xs text-primary">{r.code}</span><StatusPill status={r.status} /></div>
            <Link to="/recipes/$id" params={{ id: r.id }} className="mt-1 block font-semibold hover:text-primary">{r.name} <span className="font-mono text-xs text-muted-foreground">{r.version}</span></Link>
            <div className="mt-1 text-xs text-muted-foreground">{r.items.length} components · {r.process.length} steps · {r.targetYield.value}{r.targetYield.unit}</div>
            <button disabled={!canExec || !canRecord} onClick={() => setStartFor(r.id)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-success/40 bg-success/10 py-2 text-xs font-medium text-success hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-40">
              {canRecord ? <><Play className="h-3.5 w-3.5" /> Start execution</> : <><Lock className="h-3.5 w-3.5" /> Operator only</>}
            </button>
          </div>
        ))}
      </div>

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border/60 p-4"><Factory className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Execution records</h3></div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pl-4 pr-3">ID</th><th className="pr-3">Recipe</th><th className="pr-3">Order / Batch</th><th className="pr-3">Equipment</th><th className="pr-3">Operator</th><th className="pr-3">Started</th><th className="pr-3">Status</th><th className="pr-3">QC</th><th></th>
          </tr></thead>
          <tbody>
            {executions.map((e) => (
              <tr key={e.id} className="border-t border-border/40">
                <td className="py-2.5 pl-4 pr-3 font-mono text-xs text-primary">{e.id}</td>
                <td className="pr-3 text-xs">{e.recipeCode} <span className="font-mono text-muted-foreground">{e.version}</span></td>
                <td className="pr-3 font-mono text-xs">{e.productionOrder}<div className="text-muted-foreground">{e.batch}</div></td>
                <td className="pr-3 text-xs">{e.equipment}<div className="text-muted-foreground">{e.line} · {e.source}</div></td>
                <td className="pr-3 text-xs">{e.operator}</td>
                <td className="pr-3 font-mono text-[11px]">{e.startedAt}</td>
                <td className="pr-3"><StatusPill status={e.status} /></td>
                <td className="pr-3"><StatusPill status={e.qcStatus} /></td>
                <td className="pr-3">
                  {e.status === "running" && canRecord && (
                    <div className="flex gap-1">
                      <button onClick={() => setFinish(e.id)} className="rounded p-1 text-success hover:bg-success/10" title="Complete"><CheckCircle2 className="h-4 w-4" /></button>
                      <button onClick={() => { updateExecution(e.id, { status: "aborted", finishedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }); toast("Execution aborted"); }} className="rounded p-1 text-destructive hover:bg-destructive/10" title="Abort"><Square className="h-4 w-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EntityFormDialog open={!!startFor} onClose={() => setStartFor(null)} title="Start production execution" fields={startFields}
        initial={{ line: "Line 1", equipment: "Mixer MX-02", source: "MES" }} submitLabel="Start"
        onSubmit={async (v: any) => {
          const r = recipes.find((x) => x.id === startFor);
          if (!r || r.status !== "released") { toast.error("Only released recipes can be executed"); return; }
          const ok = await addExecution({ recipeId: r.id, recipeCode: r.code, version: r.version, productionOrder: v.productionOrder, batch: v.batch, equipment: v.equipment, line: v.line, source: v.source, operator: actor, startedAt: new Date().toISOString().slice(0, 16).replace("T", " "), finishedAt: null, status: "running", qcStatus: "pending" });
          if (ok) toast.success(`Execution started${v.source === "MES" ? " · sent to MES Command Center" : ""}`);
          setStartFor(null);
        }} />
      <EntityFormDialog open={!!finish} onClose={() => setFinish(null)} title="Complete execution" fields={finishFields} submitLabel="Complete"
        onSubmit={(v) => {
          updateExecution(finish!, { status: "completed", actualYield: Number(v.actualYield), notes: v.notes, finishedAt: new Date().toISOString().slice(0, 16).replace("T", " ") });
          toast.success("Execution recorded · QC sample requested in CORTA QC");
          setFinish(null);
        }} />
    </div>
  );
}
