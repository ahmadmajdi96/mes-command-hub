import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Lock, Workflow } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { stageGates } from "@/lib/rms-data";

export const Route = createFileRoute("/workflows")({
  head: () => ({ meta: [{ title: "Stage-Gate Pipelines · Cortanex RMS" }, { name: "description", content: "Configurable multi-stage approval pipelines for recipe release." }] }),
  component: Workflows,
});

const GATE_ORDER = ["draft", "review", "regulatory", "costing", "released"] as const;

function Workflows() {
  const { recipes } = useRms();
  const sg = stageGates[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Stage-Gate Pipelines</h1>
        <p className="text-sm text-muted-foreground">Visual node interface: Draft → Regulatory → Costing → Released. Fields lock on gate entry.</p>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{sg.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sg.gates.map((g, i) => (
            <div key={g.key} className="flex items-center gap-2">
              <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage {i + 1}</div>
                <div className="mt-0.5 text-sm font-semibold">{g.label}</div>
                <div className="mt-1 text-[11px] text-primary">{g.requiredRole}</div>
              </div>
              {i < sg.gates.length - 1 && <div className="text-muted-foreground">→</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold">Recipes by gate</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {GATE_ORDER.map((g) => {
            const rs = recipes.filter((r) => r.status === g);
            return (
              <div key={g} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <StatusPill status={g} />
                  <span className="font-mono text-[10px] text-muted-foreground">{rs.length}</span>
                </div>
                <div className="space-y-1.5">
                  {rs.length === 0 && <p className="text-[11px] text-muted-foreground">Empty</p>}
                  {rs.map((r) => (
                    <div key={r.id} className="rounded-md bg-background/60 p-2 text-xs">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.code} · {r.version}</div>
                      {g !== "draft" && <div className="mt-1 flex items-center gap-1 text-[10px] text-warning"><Lock className="h-3 w-3" /> Fields locked</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold">Gate-entry field locking</h3>
        <p className="mt-1 text-xs text-muted-foreground">Moving a recipe from Draft into any approval gate switches all composition fields to read-only. Unauthorized PUT/DELETE returns HTTP 403 <code className="font-mono text-primary">RECIPE_STATE_LOCKED</code>.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Draft phase</div>
            <p className="mt-1 text-muted-foreground">All quantities and components editable. Save/autosave enabled.</p>
          </div>
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-warning"><Lock className="h-4 w-4" /> Under review</div>
            <p className="mt-1 text-muted-foreground">UI fields disabled, save button hidden, API writes rejected 403.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
