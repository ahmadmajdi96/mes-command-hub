import { createFileRoute } from "@tanstack/react-router";
import { useRms } from "@/lib/rms-store";
import { Bell, Building2, Palette, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Cortanex RMS" }, { name: "description", content: "Workspace settings, notifications and API error handling reference." }] }),
  component: SettingsPage,
});

const ERRORS = [
  { code: "401", sub: "INVALID_AUTH_TOKEN", cause: "API key malformed, unrecognized, or expired.", remediation: "Reject request. Block DB connection. Log attempt to security trail." },
  { code: "403", sub: "RECIPE_STATE_LOCKED", cause: "PUT / DELETE targeting a recipe in Under Review or Released state.", remediation: "Block transaction. Return current version to client to force sync." },
  { code: "403", sub: "SCOPE_INSUFFICIENT", cause: "Token missing required scope for the requested endpoint.", remediation: "Reject request. Return required scope list." },
  { code: "409", sub: "VERSION_MISMATCH", cause: "Client PUT payload is stale relative to server master.", remediation: "Return current server version. Ask client to rebase and retry." },
  { code: "422", sub: "TOLERANCE_VIOLATION", cause: "Line item quantity outside min/max tolerance percentages.", remediation: "Reject write. Return per-field violation details." },
  { code: "429", sub: "RATE_LIMIT_EXCEEDED", cause: "Token exceeded per-hour throttle threshold.", remediation: "Reject with Retry-After header. Log usage event." },
];

function SettingsPage() {
  const { role } = useRms();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Signed in as <span className="text-primary">{role}</span></p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Workspace</h3></div>
          <div className="mt-3 space-y-2 text-xs">
            <Row label="Organization" value="Cortanex Labs" />
            <Row label="Instance" value="rms.prod.cortanex.io" />
            <Row label="Region" value="eu-central-1" />
            <Row label="Time zone" value="Europe/Amsterdam" />
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Notifications</h3></div>
          <div className="mt-3 space-y-2 text-xs">
            <Toggle label="Gate transition alerts" defaultOn />
            <Toggle label="Trial failure notifications" defaultOn />
            <Toggle label="API key expiring in 7 days" defaultOn />
            <Toggle label="Weekly R&D digest" />
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Appearance</h3></div>
          <div className="mt-3 space-y-2 text-xs">
            <Row label="Theme" value="Industrial Dark (fixed)" />
            <Row label="Density" value="Comfortable" />
            <Row label="Font" value="Space Grotesk / JetBrains Mono" />
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Security posture</h3></div>
          <div className="mt-3 space-y-2 text-xs">
            <Row label="MFA required" value="All roles" />
            <Row label="Session timeout" value="30 min" />
            <Row label="Audit retention" value="10 years" />
            <Row label="Dual-signature purge" value="Enforced" />
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 p-5">
          <h3 className="text-sm font-semibold">REST client error handling matrix</h3>
          <p className="text-xs text-muted-foreground">Standardized responses for downstream integration failures.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">HTTP</th>
              <th className="py-3 pr-3 font-medium">Sub-code</th>
              <th className="py-3 pr-3 font-medium">Trigger</th>
              <th className="py-3 pr-4 font-medium">Remediation</th>
            </tr>
          </thead>
          <tbody>
            {ERRORS.map((e) => (
              <tr key={e.sub} className="border-t border-border/40">
                <td className="py-3 pl-4 pr-3 font-mono text-destructive">{e.code}</td>
                <td className="py-3 pr-3 font-mono text-xs text-primary">{e.sub}</td>
                <td className="py-3 pr-3 text-xs text-muted-foreground">{e.cause}</td>
                <td className="py-3 pr-4 text-xs">{e.remediation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultOn} className="h-4 w-4 accent-primary" />
    </label>
  );
}
