import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Workflow, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRms, type Settings } from "@/lib/rms-store";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings · Cortanex RMS" },
    { name: "description", content: "Organization profile, approval workflow and e-signature policy." },
    { property: "og:title", content: "Settings · Cortanex RMS" },
    { property: "og:description", content: "Organization profile, approval workflow and e-signature policy." },
  ] }),
  component: SettingsPage,
});

const field = "h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:border-primary/50 focus:outline-none disabled:opacity-60";

function SettingsPage() {
  const { settings, updateSetting, can } = useRms();
  const admin = can("settings.manage");
  const [org, setOrg] = useState<Settings["organization"]>(settings.organization);
  const [wf, setWf] = useState<Settings["workflow"]>(settings.workflow);
  useEffect(() => { setOrg(settings.organization); setWf(settings.workflow); }, [settings.organization, settings.workflow]);

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Changes are saved to the database and recorded in the audit trail.</p>
        {!admin && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> Read-only — only RMS Administrators can change settings.</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Organization</h3></div>
          <label className="block text-xs text-muted-foreground">Name<input disabled={!admin} value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Time zone<input disabled={!admin} value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Recipe code prefix<input disabled={!admin} value={org.codePrefix} onChange={(e) => setOrg({ ...org, codePrefix: e.target.value.toUpperCase() })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Default yield unit<input disabled={!admin} value={org.defaultUnit} onChange={(e) => setOrg({ ...org, defaultUnit: e.target.value })} className={field} /></label>
          <label className="block text-xs text-muted-foreground">Auto sign-out after inactivity (minutes)<input disabled={!admin} type="number" min={5} value={org.sessionTimeoutMin} onChange={(e) => setOrg({ ...org, sessionTimeoutMin: Number(e.target.value) })} className={field} /></label>
          {admin && <button onClick={() => updateSetting("organization", org).then(() => toast.success("Organization saved"))} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Save className="h-3 w-3" /> Save</button>}
        </div>
        <div className="glass-panel space-y-3 rounded-2xl p-5">
          <div className="flex items-center gap-2"><Workflow className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Approval workflow</h3></div>
          <label className="block text-xs text-muted-foreground">QA approvals required before a recipe is Approved
            <select disabled={!admin} value={wf.qaApprovalsRequired} onChange={(e) => setWf({ ...wf, qaApprovalsRequired: Number(e.target.value) })} className={field}>
              <option value={1}>1 approver</option><option value={2}>2 approvers</option><option value={3}>3 approvers</option>
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">Review target (days before flagged overdue)<input disabled={!admin} type="number" min={1} value={wf.reviewSlaDays} onChange={(e) => setWf({ ...wf, reviewSlaDays: Number(e.target.value) })} className={field} /></label>
          <label className="flex items-center gap-2 text-xs"><input disabled={!admin} type="checkbox" checked={wf.requireSignature} onChange={(e) => setWf({ ...wf, requireSignature: e.target.checked })} /> Require electronic signature (password) to approve, reject, release or obsolete</label>
          {admin && <button onClick={() => updateSetting("workflow", wf).then(() => toast.success("Workflow saved"))} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Save className="h-3 w-3" /> Save</button>}
        </div>
      </div>
    </div>
  );
}
