import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArrowRight, FileWarning, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/retention")({
  head: () => ({ meta: [{ title: "Retention Policy · Cortanex RMS" }, { name: "description", content: "Structural data lifecycle: Active → Warm → Soft Purge, with dual-signature override." }] }),
  component: Retention,
});

const PHASES = [
  { key: "hot", label: "Active Hot", desc: "Live drafts, in-progress trials, released masters. Instant read/write.", tone: "primary" as const },
  { key: "warm", label: "Compressed Warm", desc: "Aged failed variants, archived branches. Read-only, compressed storage.", tone: "info" as const },
  { key: "purge", label: "Soft Purge / Export", desc: "Requires dual-signature override. Exported to cold archive or deleted.", tone: "destructive" as const },
];

const RULES = [
  { entity: "Approved Master Specifications", policy: "Kept in Hot storage indefinitely. Never eligible for removal.", icon: ShieldCheck, tone: "success" as const },
  { entity: "Draft Recipes (untouched)", policy: "Hot → Warm after 180 days idle.", icon: Archive, tone: "info" as const },
  { entity: "Failed Trial Logs", policy: "Hot → Warm after 90 days, retained 5 years for audit.", icon: FileWarning, tone: "warning" as const },
  { entity: "Revoked API Tokens", policy: "Hot → Warm after 30 days. Purged after 2 years.", icon: Archive, tone: "info" as const },
  { entity: "Audit Trail", policy: "Immutable. Warm-compressed after 1 year, retained ≥ 10 years.", icon: ShieldCheck, tone: "success" as const },
];

const toneClass = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  info: "border-info/40 bg-info/10 text-info",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
};

function Retention() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Retention Policy</h1>
        <p className="text-sm text-muted-foreground">Structural lifecycles — data cascades instead of instant deletion.</p>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          {PHASES.map((p, i) => (
            <div key={p.key} className="flex items-center gap-3">
              <div className={`rounded-xl border px-4 py-3 ${toneClass[p.tone]}`}>
                <div className="text-[10px] uppercase tracking-wider">Phase {i + 1}</div>
                <div className="mt-0.5 text-sm font-semibold">{p.label}</div>
                <div className="mt-1 max-w-[220px] text-[11px] opacity-80">{p.desc}</div>
              </div>
              {i < PHASES.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">Entity</th>
              <th className="py-3 pr-3 font-medium">Policy</th>
              <th className="py-3 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.entity} className="border-t border-border/40">
                <td className="py-3 pl-4 pr-3">
                  <div className="flex items-center gap-2">
                    <r.icon className={`h-4 w-4 text-${r.tone === "success" ? "success" : r.tone === "warning" ? "warning" : "info"}`} />
                    <span className="font-medium">{r.entity}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{r.policy}</td>
                <td className="py-3 pr-4 text-right"><button className="rounded-md border border-border/60 bg-card/60 px-2.5 py-1 text-[11px]">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
