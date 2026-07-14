import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GitBranch, GitFork, Plus, Search } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import type { Recipe } from "@/lib/rms-data";

export const Route = createFileRoute("/branches")({
  head: () => ({ meta: [{ title: "Variant Branches · Cortanex RMS" }, { name: "description", content: "Tree branches for parallel recipe variants across projects." }] }),
  component: Branches,
});

function Branches() {
  const { recipes } = useRms();
  const [q, setQ] = useState("");
  const [activeProject, setActiveProject] = useState<string>("all");

  const projects = useMemo(() => Array.from(new Set(recipes.map((r) => r.project))), [recipes]);

  const totals = {
    variants: recipes.filter((r) => r.parentId).length,
    roots: recipes.filter((r) => !r.parentId).length,
    projects: projects.length,
  };

  const filteredProjects = activeProject === "all" ? projects : projects.filter((p) => p === activeProject);

  return (
    <div className="space-y-5">
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-info">Version tree</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Variant Branches</h1>
            <p className="mt-1 text-sm text-muted-foreground">Non-linear version tree — a baseline can split into parallel variants for parallel testing.</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-info px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-info/20 hover:bg-info/90">
            <Plus className="h-3.5 w-3.5" /> Branch a variant
          </button>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Baseline recipes", value: totals.roots },
            { label: "Variants in tree", value: totals.variants },
            { label: "Projects tracked", value: totals.projects },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="mt-1 font-mono text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter branch label or recipe name…"
            className="h-9 w-full rounded-lg border border-border/60 bg-card/60 pl-8 pr-3 text-sm focus:border-primary/50 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setActiveProject("all")}
            className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${activeProject === "all" ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>All projects</button>
          {projects.map((p) => (
            <button key={p} onClick={() => setActiveProject(p)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] ${activeProject === p ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>{p}</button>
          ))}
        </div>
      </div>

      {filteredProjects.map((p) => {
        const rs = recipes.filter((r) => r.project === p);
        const roots = rs.filter((r) => !r.parentId);
        return (
          <div key={p} className="glass-panel rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-info/20 text-primary">
                  <GitFork className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{p}</h3>
                  <div className="text-[11px] text-muted-foreground">{rs.length} nodes · {rs.filter((r) => r.parentId).length} variants</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {roots.map((root) => <BranchNode key={root.id} r={root} all={rs} depth={0} filter={q} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BranchNode({ r, all, depth, filter }: { r: Recipe; all: Recipe[]; depth: number; filter: string }) {
  const kids = all.filter((c) => c.parentId === r.id);
  const matches = filter === "" || (r.name + (r.branchLabel ?? "") + r.version).toLowerCase().includes(filter.toLowerCase());
  const hasMatchingDescendant = kids.some((k) => hasMatch(k, all, filter));
  if (!matches && !hasMatchingDescendant) return null;
  const isRoot = depth === 0;

  return (
    <div>
      <Link to="/recipes/$id" params={{ id: r.id }}
        className={`group relative flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-card/70 ${matches ? "border-border/60 bg-card/40" : "border-border/40 bg-card/20 opacity-60"}`}>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isRoot ? "bg-primary/15 text-primary" : "bg-info/10 text-info"}`}>
          {isRoot ? <GitFork className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.code} · {r.version}</span>
            {isRoot && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">baseline</span>}
            {r.branchLabel && <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] text-info">↳ {r.branchLabel}</span>}
          </div>
          <div className="mt-0.5 text-sm font-medium">{r.name}</div>
          <div className="text-[11px] text-muted-foreground">{r.items.length} components · {r.process.length} process steps · updated {r.updatedAt}</div>
        </div>
        <StatusPill status={r.status} />
      </Link>
      {kids.length > 0 && (
        <div className="relative mt-2 space-y-2 pl-6">
          <div className="pointer-events-none absolute left-4 top-0 h-full w-px bg-gradient-to-b from-info/40 via-info/20 to-transparent" />
          {kids.map((k) => (
            <div key={k.id} className="relative">
              <div className="pointer-events-none absolute -left-2 top-6 h-px w-4 bg-info/30" />
              <BranchNode r={k} all={all} depth={depth + 1} filter={filter} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hasMatch(r: Recipe, all: Recipe[], filter: string): boolean {
  if (filter === "") return true;
  if ((r.name + (r.branchLabel ?? "") + r.version).toLowerCase().includes(filter.toLowerCase())) return true;
  return all.filter((c) => c.parentId === r.id).some((c) => hasMatch(c, all, filter));
}
