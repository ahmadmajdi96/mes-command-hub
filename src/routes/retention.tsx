import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Save, Lock, Gavel } from "lucide-react";
import { toast } from "sonner";
import { useRms, type Settings } from "@/lib/rms-store";

export const Route = createFileRoute("/retention")({
  head: () => ({ meta: [
    { title: "Retention Policy · Cortanex RMS" },
    { name: "description", content: "How long recipes, trials, executions and audit records are kept, plus legal hold." },
    { property: "og:title", content: "Retention Policy · Cortanex RMS" },
    { property: "og:description", content: "Retention periods and legal hold for regulated recipe records." },
  ] }),
  component: Retention,
});

const field = "h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:outline-none disabled:opacity-60";

function Retention() {
  const { settings, updateSetting, can, recipes, trials, executions, audit } = useRms();
  const admin = can("settings.manage");
  const [r, setR] = useState<Settings["retention"]>(settings.retention);
  useEffect(() => setR(settings.retention), [settings.retention]);
  const idleDrafts = recipes.filter((x) => x.status === "draft" && (Date.now() - new Date(x.updatedAt).getTime()) / 86400000 > r.draftIdleDays);

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Retention Policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Released recipes and the audit trail are never deleted. Other records follow these periods.</p>
        {!admin && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> Read-only for your role.</p>}
      </div>
      {r.legalHold && <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"><Gavel className="h-4 w-4" /> Legal hold is ON — nothing may be archived or removed.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel space-y-3 rounded-2xl p-5">
          <h3 className="text-sm font-semibold">Retention periods</h3>
          <label className="block text-xs text-muted-foreground">Audit trail (years, minimum 10)<input disabled={!admin} type="number" min={10} value={r.auditYears} onChange={(e) => setR({ ...r, auditYears: Math.max(10, Number(e.target.value)) })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Flag drafts idle for (days)<input disabled={!admin} type="number" min={30} value={r.draftIdleDays} onChange={(e) => setR({ ...r, draftIdleDays: Number(e.target.value) })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Trial logs (years)<input disabled={!admin} type="number" min={1} value={r.trialYears} onChange={(e) => setR({ ...r, trialYears: Number(e.target.value) })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Production executions (years)<input disabled={!admin} type="number" min={1} value={r.executionYears} onChange={(e) => setR({ ...r, executionYears: Number(e.target.value) })} className={field} /></label>
          <label className="flex items-center gap-2 text-xs"><input disabled={!admin} type="checkbox" checked={r.legalHold} onChange={(e) => setR({ ...r, legalHold: e.target.checked })} /> Legal hold (freeze all records)</label>
          {admin && <button onClick={() => updateSetting("retention", r).then(() => toast.success("Retention policy saved"))} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Save className="h-3 w-3" /> Save</button>}
        </div>
        <div className="glass-panel space-y-2 rounded-2xl p-5 text-xs">
          <h3 className="text-sm font-semibold">Current holdings</h3>
          <div className="flex justify-between"><span>Recipes (all versions)</span><span className="font-mono">{recipes.length}</span></div>
          <div className="flex justify-between"><span>Trial logs</span><span className="font-mono">{trials.length}</span></div>
          <div className="flex justify-between"><span>Production executions</span><span className="font-mono">{executions.length}</span></div>
          <div className="flex justify-between"><span>Audit entries (latest 500 loaded)</span><span className="font-mono">{audit.length}</span></div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/40 bg-success/5 p-2"><ShieldCheck className="h-4 w-4 shrink-0 text-success" /> Released, superseded and obsolete recipes can't be deleted — the database only allows deleting your own drafts.</div>
          <div className="mt-2 rounded-lg border border-warning/40 bg-warning/5 p-2">{idleDrafts.length} draft(s) idle longer than {r.draftIdleDays} days{idleDrafts.length > 0 && `: ${idleDrafts.map((d) => d.code).join(", ")}`}</div>
        </div>
      </div>
    </div>
  );
}
