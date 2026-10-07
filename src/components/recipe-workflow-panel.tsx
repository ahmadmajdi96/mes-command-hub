import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Copy, GitBranch, Download, History, PenLine, GitCompareArrows, FileText } from "lucide-react";
import { useRms, ACTION_META, type WorkflowAction } from "@/lib/rms-store";
import { validateRecipe, type Recipe } from "@/lib/rms-data";
import { signRecipeAction } from "@/lib/esign.functions";
import { publishRecipeEvent } from "@/lib/integrations.functions";

const SIGNED: WorkflowAction[] = ["approve", "reject", "release", "obsolete"];

function diffRecipes(prev: Recipe, cur: Recipe) {
  const rows: { kind: "added" | "removed" | "changed"; label: string; detail: string }[] = [];
  for (const it of cur.items) {
    const p = prev.items.find((x) => x.refId === it.refId);
    if (!p) rows.push({ kind: "added", label: it.name, detail: `${it.targetPct}%` });
    else if (p.targetPct !== it.targetPct || p.minPct !== it.minPct || p.maxPct !== it.maxPct) rows.push({ kind: "changed", label: it.name, detail: `${p.targetPct}% → ${it.targetPct}% (limits ${p.minPct}–${p.maxPct} → ${it.minPct}–${it.maxPct})` });
  }
  for (const p of prev.items) if (!cur.items.some((x) => x.refId === p.refId)) rows.push({ kind: "removed", label: p.name, detail: `${p.targetPct}%` });
  const maxSteps = Math.max(prev.process.length, cur.process.length);
  for (let i = 0; i < maxSteps; i++) {
    const a = prev.process[i], b = cur.process[i];
    if (a && !b) rows.push({ kind: "removed", label: `Step ${a.seq} ${a.phase}`, detail: `${a.targetValue}${a.unit}` });
    else if (!a && b) rows.push({ kind: "added", label: `Step ${b.seq} ${b.phase}`, detail: `${b.targetValue}${b.unit}, ${b.durationMin} min` });
    else if (a && b && (a.phase !== b.phase || a.targetValue !== b.targetValue || a.durationMin !== b.durationMin)) rows.push({ kind: "changed", label: `Step ${b.seq} ${b.phase}`, detail: `${a.targetValue}${a.unit}/${a.durationMin}min → ${b.targetValue}${b.unit}/${b.durationMin}min` });
  }
  if (prev.compliance.shelfLifeDays !== cur.compliance.shelfLifeDays) rows.push({ kind: "changed", label: "Shelf life", detail: `${prev.compliance.shelfLifeDays} → ${cur.compliance.shelfLifeDays} days` });
  if (prev.targetYield.value !== cur.targetYield.value) rows.push({ kind: "changed", label: "Target yield", detail: `${prev.targetYield.value} → ${cur.targetYield.value} ${cur.targetYield.unit}` });
  return rows;
}

export function RecipeWorkflowPanel({ recipe }: { recipe: Recipe }) {
  const { role, actor, can, transition, newVersion, copyRecipe, rules, materials, recipes, audit, logAudit, settings, executions } = useRms();
  const navigate = useNavigate();
  const sign = useServerFn(signRecipeAction);
  const publish = useServerFn(publishRecipeEvent);
  const [pending, setPending] = useState<WorkflowAction | null>(null);
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const issues = validateRecipe(recipe, rules, materials, recipes);
  const errors = issues.filter((i) => i.severity === "error");
  const needsSig = (a: WorkflowAction) => SIGNED.includes(a) && settings.workflow.requireSignature;

  const actions = (Object.keys(ACTION_META) as WorkflowAction[]).filter((a) => ACTION_META[a].from.includes(recipe.status));
  const history = audit.filter((a) => a.entity === recipe.id);
  const baseline = useMemo(() => {
    const family = recipes.filter((r) => r.code === recipe.code && r.id !== recipe.id);
    return family.find((r) => r.status === "released") ?? family.find((r) => r.status === "superseded") ?? (recipe.parentId ? recipes.find((r) => r.id === recipe.parentId) : undefined);
  }, [recipes, recipe]);
  const diff = baseline ? diffRecipes(baseline, recipe) : [];
  const runs = executions.filter((e) => e.recipeId === recipe.id);

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      let sig: string | undefined;
      if (needsSig(pending)) {
        if (!password) { toast.error("Enter your password to sign"); return; }
        const s = await sign({ data: { recipeId: recipe.id, action: pending as "approve" | "reject" | "release" | "obsolete", password } });
        if (!s.ok) { toast.error(s.error); return; }
        sig = s.sig;
      }
      const res = await transition(recipe.id, pending, reason, sig);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`${ACTION_META[pending].label} · recorded${sig ? " with e-signature" : ""}`);
      const event = pending === "release" ? "recipe.released" : pending === "obsolete" ? "recipe.obsoleted" : pending === "approve" ? "recipe.approved" : null;
      if (event) {
        publish({ data: { recipeId: recipe.id, event } }).then((r) => {
          const failed = r.filter((x) => !x.ok);
          if (failed.length) toast.warning(`Saved, but ${failed.length} connected system(s) did not receive it — see Integrations → Message log`);
          else if (r.length) toast.success("Sent to connected systems");
        }).catch(() => toast.warning("Saved, but publishing to connected systems failed"));
      }
      setPending(null); setReason(""); setPassword("");
    } finally { setBusy(false); }
  };

  const download = (fmt: "json" | "xml" | "pdf") => {
    if (recipe.status !== "released") return toast.error("Only released recipes can be downloaded for execution");
    if (fmt === "pdf") {
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><head><title>${recipe.code} ${recipe.version}</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #999;padding:4px 8px;font-size:12px;text-align:left}</style></head><body>
        <h2>${recipe.name} — ${recipe.code} ${recipe.version}</h2><p>Status: RELEASED · Approved by ${recipe.approvedBy.join(", ") || "—"} · Yield ${recipe.targetYield.value} ${recipe.targetYield.unit}</p>
        <table><tr><th>Component</th><th>Target %</th><th>Min</th><th>Max</th><th>Qty</th></tr>${recipe.items.map((i) => `<tr><td>${i.name}</td><td>${i.targetPct}</td><td>${i.minPct}</td><td>${i.maxPct}</td><td>${(recipe.targetYield.value * i.targetPct / 100).toFixed(3)} ${i.unit}</td></tr>`).join("")}</table>
        <table><tr><th>#</th><th>Phase</th><th>Parameter</th><th>Target</th><th>Duration</th></tr>${recipe.process.map((p) => `<tr><td>${p.seq}</td><td>${p.phase}</td><td>${p.parameter}</td><td>${p.targetValue} ${p.unit}</td><td>${p.durationMin} min</td></tr>`).join("")}</table>
        <p>Hazards: ${recipe.compliance.hazards.join(", ") || "none"} · Allergens: ${recipe.compliance.allergens.join(", ") || "none"} · Storage ≤ ${recipe.compliance.storageMaxC}°C · Shelf life ${recipe.compliance.shelfLifeDays} d</p>
        <p style="font-size:10px;color:#666">Printed ${new Date().toISOString()} by ${actor}</p><script>window.print()</script></body></html>`);
      w.document.close();
    } else {
      const body = fmt === "json" ? JSON.stringify(recipe, null, 2)
        : `<recipe id="${recipe.id}" code="${recipe.code}" version="${recipe.version}">\n${recipe.items.map((i) => `  <item ref="${i.refId}" pct="${i.targetPct}" min="${i.minPct}" max="${i.maxPct}" unit="${i.unit}"/>`).join("\n")}\n${recipe.process.map((p) => `  <step seq="${p.seq}" phase="${p.phase}" param="${p.parameter}" value="${p.targetValue}" unit="${p.unit}" min="${p.durationMin}"/>`).join("\n")}\n</recipe>`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([body], { type: fmt === "json" ? "application/json" : "application/xml" }));
      a.download = `${recipe.code}_${recipe.version}.${fmt}`; a.click();
    }
    logAudit({ action: "DOWNLOAD", entity: recipe.id, property: "format", before: "—", after: fmt, version: recipe.version });
  };

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Workflow &amp; validation</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Signed in as <span className="text-foreground">{actor}</span> · {role}. Author: {recipe.createdBy}{recipe.approvedBy.length ? ` · Approved by ${recipe.approvedBy.join(", ")}` : ""}
            {recipe.status === "review" && settings.workflow.qaApprovalsRequired > 1 && ` · ${recipe.approvedBy.length}/${settings.workflow.qaApprovalsRequired} QA approvals`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const allowed = can(ACTION_META[a].perm);
            const selfBlocked = (a === "approve" || a === "release") && recipe.createdBy === actor;
            const destructive = a === "reject" || a === "obsolete";
            return (
              <button key={a} disabled={!allowed || selfBlocked} onClick={() => setPending(a)}
                title={!allowed ? `Not permitted for your role` : selfBlocked ? "Cannot approve/release own recipe" : ""}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${destructive ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20" : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"}`}>
                {needsSig(a) && <PenLine className="h-3 w-3" />}{ACTION_META[a].label}
              </button>
            );
          })}
          {can("recipe.version") && ["released", "approved", "superseded", "rejected", "obsolete"].includes(recipe.status) && (
            <button onClick={async () => { const id = await newVersion(recipe.id, "New revision"); if (id) navigate({ to: "/recipes/$id", params: { id } }); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><GitBranch className="h-3 w-3" /> New version</button>
          )}
          {can("recipe.copy") && (
            <button onClick={async () => { const id = await copyRecipe(recipe.id); if (id) navigate({ to: "/recipes/$id", params: { id } }); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><Copy className="h-3 w-3" /> Copy</button>
          )}
          {can("recipe.download") && recipe.status === "released" && (
            <>
              <button onClick={() => download("pdf")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><FileText className="h-3 w-3" /> Recipe sheet</button>
              <button onClick={() => download("json")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><Download className="h-3 w-3" /> JSON</button>
              <button onClick={() => download("xml")} className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary"><Download className="h-3 w-3" /> XML</button>
            </>
          )}
        </div>
      </div>

      {pending && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs font-medium">{ACTION_META[pending].label} — {recipe.code} {recipe.version}</div>
          {(pending === "approve" || pending === "release") && diff.length > 0 && <p className="mt-1 text-[11px] text-warning">{diff.length} change(s) vs {baseline?.version} — review the comparison below before signing.</p>}
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder={["reject", "return", "obsolete"].includes(pending) ? "Reason (required)" : "Comment / meaning of signature (optional)"}
            className="mt-2 w-full rounded-lg border border-border/60 bg-background/60 p-2 text-xs focus:border-primary/50 focus:outline-none" />
          {needsSig(pending) && (
            <div className="mt-2">
              <label className="text-[11px] text-muted-foreground">Electronic signature — I, {actor}, confirm this decision. Enter your password:</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="mt-1 h-9 w-full rounded-lg border border-border/60 bg-background/60 px-2 text-xs focus:border-primary/50 focus:outline-none" />
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => { setPending(null); setPassword(""); }} className="rounded-md px-3 py-1 text-xs text-muted-foreground">Cancel</button>
            <button disabled={busy} onClick={run} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">{needsSig(pending) ? "Sign & confirm" : "Confirm"}</button>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
          <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><GitCompareArrows className="h-3 w-3" /> Changes vs {baseline ? `${baseline.version} (${baseline.status})` : "—"}</div>
          {!baseline ? <p className="text-xs text-muted-foreground">No earlier version to compare with.</p> : diff.length === 0 ? <p className="text-xs text-muted-foreground">Identical to {baseline.version}.</p> : (
            <ul className="space-y-1.5">
              {diff.map((d, i) => (
                <li key={i} className="rounded-lg border border-border/50 bg-card/40 p-2 text-xs">
                  <span className={`mr-1 rounded px-1 text-[10px] uppercase ${d.kind === "added" ? "bg-success/15 text-success" : d.kind === "removed" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>{d.kind}</span>
                  <span className="font-medium">{d.label}</span> <span className="text-muted-foreground">{d.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><History className="h-3 w-3" /> History &amp; signatures</div>
          {history.length === 0 ? <p className="text-xs text-muted-foreground">No recorded actions yet.</p> : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {history.slice(0, 20).map((h) => (
                <li key={h.id} className="rounded-lg border border-border/50 bg-card/40 p-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{h.action}{h.signed && <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-success/15 px-1 text-[9px] text-success"><PenLine className="h-2.5 w-2.5" /> signed</span>}</span><span className="font-mono text-[10px] text-muted-foreground">{h.ts}</span></div>
                  <div className="truncate text-muted-foreground">{h.user} · {h.property === "items" || h.property === "process" ? `${h.property} changed` : `${h.before} → ${h.after}`}{h.reason ? ` · “${h.reason}”` : ""}</div>
                </li>
              ))}
            </ul>
          )}
          {runs.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">Used in {runs.length} production run(s).</p>}
        </div>
      </div>
    </div>
  );
}
