import { createFileRoute, Link } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import type { Recipe } from "@/lib/rms-data";

export const Route = createFileRoute("/branches")({
  head: () => ({ meta: [{ title: "Variant Branches · Cortanex RMS" }, { name: "description", content: "Tree branches for parallel recipe variants across projects." }] }),
  component: Branches,
});

function Branches() {
  const { recipes } = useRms();
  const projects = Array.from(new Set(recipes.map((r) => r.project)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Variant Branches</h1>
        <p className="text-sm text-muted-foreground">Non-linear version tree — a baseline can split into parallel variants for testing.</p>
      </div>

      {projects.map((p) => {
        const rs = recipes.filter((r) => r.project === p);
        const roots = rs.filter((r) => !r.parentId);
        return (
          <div key={p} className="glass-panel rounded-2xl p-5">
            <h3 className="mb-3 text-sm font-semibold">{p}</h3>
            <div className="space-y-3">
              {roots.map((root) => <BranchNode key={root.id} r={root} all={rs} depth={0} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BranchNode({ r, all, depth }: { r: Recipe; all: Recipe[]; depth: number }) {
  const kids = all.filter((c) => c.parentId === r.id);
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <Link to="/recipes/$id" params={{ id: r.id }} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition hover:border-primary/40">
        <GitBranch className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">{r.version}</span>
            <span className="font-medium">{r.branchLabel ?? r.name}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">{r.name} · {r.items.length} components</div>
        </div>
        <StatusPill status={r.status} />
      </Link>
      {kids.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l border-dashed border-border/60 pl-4">
          {kids.map((k) => <BranchNode key={k.id} r={k} all={all} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}
