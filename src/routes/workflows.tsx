import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, Workflow, TrendingUp, Users, ChevronRight, ArrowRight } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { stageGates, statusLabel } from "@/lib/rms-data";

export const Route = createFileRoute("/workflows")({
  head: () => ({ meta: [{ title: "Approval Workflow · Cortanex RMS" }, { name: "description", content: "Configurable multi-stage approval pipelines for recipe release." }, { property: "og:title", content: "Approval Workflow · Cortanex RMS" }, { property: "og:description", content: "Configurable multi-stage approval pipelines for recipe release." }] }),
  component: Workflows,
});

const GATE_ORDER = ["draft", "review", "rejected", "approved", "released", "superseded", "obsolete"] as const;
const GATE_TONE: Record<string, { bg: string; text: string; ring: string }> = {
  draft: { bg: "bg-info/10", text: "text-info", ring: "ring-info/30" },
  review: { bg: "bg-warning/10", text: "text-warning", ring: "ring-warning/30" },
  rejected: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/30" },
  approved: { bg: "bg-accent/10", text: "text-accent", ring: "ring-accent/30" },
  superseded: { bg: "bg-muted/40", text: "text-muted-foreground", ring: "ring-border" },
  obsolete: { bg: "bg-muted/40", text: "text-muted-foreground", ring: "ring-border" },
  released: { bg: "bg-success/10", text: "text-success", ring: "ring-success/30" },
};

function Workflows() {
  const { recipes } = useRms();
  const sg = stageGates[0];
  const total = recipes.length;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Governance layer</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Approval Workflow</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configurable multi-stage approval flow. Fields lock on gate entry.</p>
        </div>

        {/* Visual pipeline nodes */}
        <div className="relative mt-6 flex flex-wrap items-stretch gap-2">
          {sg.gates.map((g, i) => {
            const tone = GATE_TONE[g.key] ?? GATE_TONE.draft;
            const count = recipes.filter((r) => r.status === g.key).length;
            return (
              <div key={g.key} className="flex flex-1 items-stretch gap-2">
                <div className={`flex-1 rounded-xl border border-border/60 bg-card/40 p-3 ring-1 ${tone.ring}`}>
                  <div className="flex items-center justify-between">
                    <div className={`grid h-7 w-7 place-items-center rounded-md ${tone.bg} font-mono text-xs ${tone.text}`}>{i + 1}</div>
                    <span className={`font-mono text-lg font-semibold ${tone.text}`}>{count}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{g.label}</div>
                  <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${tone.text}`}><Users className="h-3 w-3" /> {g.requiredRole}</div>
                </div>
                {i < sg.gates.length - 1 && <div className="flex items-center text-muted-foreground/60"><ChevronRight className="h-5 w-5" /></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution bar */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pipeline distribution</h3>
          <span className="font-mono text-xs text-muted-foreground">{total} recipes total</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted/40">
          {GATE_ORDER.map((g) => {
            const c = recipes.filter((r) => r.status === g).length;
            const pct = total ? (c / total) * 100 : 0;
            const tone = GATE_TONE[g] ?? GATE_TONE.draft;
            return pct === 0 ? null : (
              <div key={g} className={`${tone.bg.replace("/10", "/60")}`} style={{ width: `${pct}%` }} title={`${statusLabel(g)}: ${c}`} />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {GATE_ORDER.map((g) => {
            const c = recipes.filter((r) => r.status === g).length;
            const tone = GATE_TONE[g] ?? GATE_TONE.draft;
            return (
              <span key={g} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-sm ${tone.bg.replace("/10", "/60")}`} /> {statusLabel(g)} <span className="font-mono">{c}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Kanban board */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Recipes by gate</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {GATE_ORDER.map((g) => {
            const rs = recipes.filter((r) => r.status === g);
            const tone = GATE_TONE[g] ?? GATE_TONE.draft;
            return (
              <div key={g} className={`rounded-xl border border-border/60 bg-card/30 p-3 ring-1 ${tone.ring}`}>
                <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2">
                  <StatusPill status={g} />
                  <span className={`font-mono text-xs ${tone.text}`}>{rs.length}</span>
                </div>
                <div className="space-y-1.5">
                  {rs.length === 0 && <p className="rounded-md border border-dashed border-border/50 p-3 text-center text-[11px] text-muted-foreground">Empty column</p>}
                  {rs.map((r) => (
                    <Link key={r.id} to="/recipes/$id" params={{ id: r.id }}
                      className="block rounded-lg border border-border/50 bg-background/60 p-2.5 text-xs transition hover:border-primary/40 hover:bg-card/70">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.code} · {r.version}</div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-mono text-[10px] text-muted-foreground">{r.targetYield.value}{r.targetYield.unit}</span>
                        {g !== "draft" && <span className="inline-flex items-center gap-1 text-[10px] text-warning"><Lock className="h-2.5 w-2.5" /> locked</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Gate-entry rules</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Moving a recipe from Draft into any approval gate switches all composition fields to read-only. Unauthorized PUT/DELETE returns HTTP 403 <code className="font-mono text-primary">RECIPE_STATE_LOCKED</code>.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Draft phase</div>
            <p className="mt-1 text-muted-foreground">All quantities and components editable. Autosave enabled.</p>
          </div>
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-warning"><Lock className="h-4 w-4" /> Under review</div>
            <p className="mt-1 text-muted-foreground">UI fields disabled, save hidden, API writes rejected 403.</p>
          </div>
          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-accent"><ArrowRight className="h-4 w-4" /> Review · Approval</div>
            <p className="mt-1 text-muted-foreground">QA / Quality Manager reviews, approves, rejects or returns with mandatory reason. Production Manager releases. Authors cannot approve/release their own work.</p>
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="h-4 w-4" /> Released</div>
            <p className="mt-1 text-muted-foreground">Immutable; available to MES & operators. Changes require a new version; releasing it supersedes the previous one.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
