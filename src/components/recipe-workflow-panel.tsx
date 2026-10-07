import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Copy, GitBranch, Download, History } from "lucide-react";
import { useRms, ACTION_META, type WorkflowAction } from "@/lib/rms-store";
import { validateRecipe, type Recipe } from "@/lib/rms-data";

export function RecipeWorkflowPanel({ recipe }: { recipe: Recipe }) {
  const { role, actor, can, transition, newVersion, copyRecipe, rules, materials, recipes, audit, logAudit } = useRms();
  const navigate = useNavigate();
  const [pending, setPending] = useState<WorkflowAction | null>(null);
  const [reason, setReason] = useState("");
  const issues = validateRecipe(recipe, rules, materials, recipes);
  const errors = issues.filter((i) => i.severity === "error");

  const actions = (Object.keys(ACTION_META) as WorkflowAction[]).filter((a) => ACTION_META[a].from.includes(recipe.status));
  const history = audit.filter((a) => a.entity === recipe.id);

  const run = () => {
    if (!pending) return;
    const res = transition(recipe.id, pending, reason);
    if (res.ok) { toast.success(`${ACTION_META[pending].label} · done`); setPending(null); setReason(""); }
    else toast.error(res.error);
  };

  const download = (fmt: "json" | "xml") => {
    if (recipe.status !== "released") return toast.error("Only released recipes can be downloaded for execution");
    const body = fmt === "json" ? JSON.stringify(recipe, null, 2)
      : `<recipe id="${recipe.id}" code="${recipe.code}" version="${recipe.version}">\n${recipe.items.map((i) => `  <item ref="${i.refId}" pct="${i.targetPct}" min="${i.minPct}" max="${i.maxPct}" unit="${i.unit}"/>`).join("\n")}\n${recipe.process.map((p) => `  <step seq="${p.seq}" phase="${p.phase}" param="${p.parameter}" value="${p.targetValue}" unit="${p.unit}" min="${p.durationMin}"/>`).join("\n")}\n</recipe>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: fmt === "json" ? "application/json" : "application/xml" }));
    a.download = `${recipe.code}_${recipe.version}.${fmt}`; a.click();
    logAudit({ action: "DOWNLOAD", entity: recipe.id, property: "format", before: "—", after: fmt, version: recipe.version });
  };

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Workflow &amp; validation</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Acting as <span className="text-foreground">{actor}</span> · {role}. Author: {recipe.createdBy}{recipe.approvedBy.length ? ` · Approved by ${recipe.approvedBy.join(", ")}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const allowed = can(ACTION_META[a].perm);
            const selfBlocked = (a === "approve" || a === "release") && recipe.createdBy === actor;
            const destructive = a === "reject" || a === "obsolete";
            return (
              <button key={a} disabled={!allowed || selfBlocked} onClick={() => setPending(a)}
                title={!allowed ? `Not permitted for ${role}` : selfBlocked ? "Cannot approve/release own recipe" : ""}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${destructive ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20" : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"}`}>
                {ACTION_META[a].label}
              </button>
            );
          })}
          {can("recipe.version") && ["released", "approved", "superseded", "rejected"].includes(recipe.status) && (
            <button onClick={() => { const id = newVersion(recipe.id, "New revision"); if (id) navigate({ to: "/recipes/$id", params: { id } }); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><GitBranch className="h-3 w-3" /> New version</button>
          )}
          {can("recipe.copy") && (
            <button onClick={() => { const id = copyRecipe(recipe.id); if (id) navigate({ to: "/recipes/$id", params: { id } }); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><Copy className="h-3 w-3" /> Copy</button>
          )}
          {can("recipe.download") && (
            <>
              <button onClick={() => download("json")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><Download className="h-3 w-3" /> JSON</button>
              <button onClick={() => download("xml")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><Download className="h-3 w-3" /> XML</button>
            </>
          )}
        </div>
      </div>

      {pending && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-medium">{ACTION_META[pending].label} — {recipe.code} {recipe.version}</div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder={["reject", "return", "obsolete"].includes(pending) ? "Reason (required)" : "Comment / change reason (optional)"}
            className="mt-2 w-full rounded-lg border border-border/60 bg-background/60 p-2 text-xs focus:border-primary/50 focus:outline-none" />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setPending(null)} className="rounded-md px-3 py-1 text-xs text-muted-foreground">Cancel</button>
            <button onClick={run} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Confirm</button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Validation ({errors.length} errors · {issues.length - errors.length} warnings)</div>
          {issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 p-2 text-xs text-success"><CheckCircle2 className="h-4 w-4" /> All enabled rules pass</div>
          ) : (
            <ul className="space-y-1.5">
              {issues.map((i, idx) => (
                <li key={idx} className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${i.severity === "error" ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"}`}>
                  {i.severity === "error" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />}
                  <span><span className="font-mono text-[10px] text-muted-foreground">{i.ruleId}</span> {i.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><History className="h-3 w-3" /> Status history</div>
          {history.length === 0 ? <p className="text-xs text-muted-foreground">No recorded actions yet.</p> : (
            <ul className="space-y-1.5">
              {history.slice(0, 8).map((h) => (
                <li key={h.id} className="rounded-lg border border-border/50 bg-card/40 p-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{h.action}</span><span className="font-mono text-[10px] text-muted-foreground">{h.ts}</span></div>
                  <div className="text-muted-foreground">{h.user} · {h.before} → {h.after}{h.reason ? ` · “${h.reason}”` : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
