import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Inbox } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { validateRecipe } from "@/lib/rms-data";

export const Route = createFileRoute("/review-queue")({
  head: () => ({ meta: [
    { title: "Review Queue · Cortanex RMS" },
    { name: "description", content: "Recipes awaiting QA review and production release, with aging against SLA." },
    { property: "og:title", content: "Review Queue · Cortanex RMS" },
    { property: "og:description", content: "Recipes awaiting QA review and production release." },
  ] }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const { recipes, audit, settings, rules, materials, can, actor } = useRms();
  const defaultTab = can("recipe.approve") ? "review" : can("recipe.release") ? "approved" : "review";
  const [tab, setTab] = useState<"review" | "approved" | "rejected">(defaultTab);
  const sla = settings.workflow.reviewSlaDays;
  const since = (id: string, status: string) => {
    const ev = audit.find((a) => a.entity === id && a.property === "status" && a.after === status);
    return ev ? ev.ts : null;
  };
  const list = recipes.filter((r) => r.status === tab).map((r) => {
    const t = since(r.id, tab) ?? r.updatedAt;
    const days = Math.floor((Date.now() - new Date(t.replace(" ", "T")).getTime()) / 86400000);
    return { r, t, days, issues: validateRecipe(r, rules, materials, recipes).filter((i) => i.severity === "error").length };
  }).sort((a, b) => b.days - a.days);

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">My work</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Review Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Oldest first. Items older than the {sla}-day target are flagged.</p>
        <div className="mt-4 flex gap-2 text-xs">
          {([["review", "Awaiting QA review"], ["approved", "Awaiting release"], ["rejected", "Returned to engineers"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg border px-3 py-1.5 ${tab === k ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"}`}>
              {l} <span className="ml-1 font-mono">{recipes.filter((r) => r.status === k).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th className="py-3 pl-4 pr-3">Recipe</th><th className="pr-3">Author</th><th className="pr-3">Approvals</th><th className="pr-3">Validation</th><th className="pr-3">Waiting</th><th className="pr-3">Status</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-xs text-muted-foreground"><Inbox className="mx-auto mb-2 h-6 w-6" />Nothing waiting here.</td></tr>}
            {list.map(({ r, days, issues }) => (
              <tr key={r.id} className="border-t border-border/40 hover:bg-muted/10">
                <td className="py-3 pl-4 pr-3"><Link to="/recipes/$id" params={{ id: r.id }} className="font-medium hover:text-primary">{r.name}</Link><div className="font-mono text-[10px] text-muted-foreground">{r.code} {r.version}</div></td>
                <td className="pr-3 text-xs">{r.createdBy}{r.createdBy === actor && <span className="ml-1 text-[10px] text-warning">(you — can't approve)</span>}</td>
                <td className="pr-3 text-xs">{r.approvedBy.length}/{settings.workflow.qaApprovalsRequired}</td>
                <td className="pr-3 text-xs">{issues ? <span className="text-destructive">{issues} error(s)</span> : <span className="text-success">passes</span>}</td>
                <td className={`pr-3 text-xs ${days > sla ? "text-destructive" : ""}`}><Clock className="mr-1 inline h-3 w-3" />{days} d{days > sla && " · overdue"}</td>
                <td className="pr-3"><StatusPill status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
