import { Link } from "@tanstack/react-router";
import { ClipboardCheck, ArrowUpRight } from "lucide-react";
import { useRms } from "@/lib/rms-store";

type Task = { label: string; count: number; to: string; tone: string };

export function MyTasks() {
  const { role, recipes, executions, actor, integrations, users, notifications } = useRms();
  const mine = recipes.filter((r) => r.createdBy === actor);
  const tasks: Task[] = [];
  if (role === "Recipe Engineer") {
    tasks.push({ label: "My drafts", count: mine.filter((r) => r.status === "draft").length, to: "/recipes", tone: "text-info" });
    tasks.push({ label: "Rejected — needs fixing", count: mine.filter((r) => r.status === "rejected").length, to: "/review-queue", tone: "text-destructive" });
    tasks.push({ label: "Waiting for QA", count: mine.filter((r) => r.status === "review").length, to: "/review-queue", tone: "text-warning" });
  } else if (role === "QA / Quality Manager") {
    tasks.push({ label: "Awaiting my review", count: recipes.filter((r) => r.status === "review" && r.createdBy !== actor && !r.approvedBy.includes(actor)).length, to: "/review-queue", tone: "text-warning" });
    tasks.push({ label: "Batches failed QC", count: executions.filter((e) => e.qcStatus === "failed").length, to: "/traceability", tone: "text-destructive" });
    tasks.push({ label: "QC results pending", count: executions.filter((e) => e.qcStatus === "pending" && e.status === "completed").length, to: "/traceability", tone: "text-info" });
  } else if (role === "Production Manager") {
    tasks.push({ label: "Approved — ready to release", count: recipes.filter((r) => r.status === "approved").length, to: "/review-queue", tone: "text-accent" });
    tasks.push({ label: "Batches running", count: executions.filter((e) => e.status === "running").length, to: "/execution", tone: "text-info" });
    tasks.push({ label: "Released recipes", count: recipes.filter((r) => r.status === "released").length, to: "/execution", tone: "text-success" });
  } else if (role === "Operator") {
    tasks.push({ label: "My running batches", count: executions.filter((e) => e.status === "running" && e.operator === actor).length, to: "/execution", tone: "text-info" });
    tasks.push({ label: "Released recipes available", count: recipes.filter((r) => r.status === "released").length, to: "/execution", tone: "text-success" });
  } else if (role === "RMS Administrator") {
    tasks.push({ label: "People without a role", count: users.filter((u) => u.roles.length === 0).length, to: "/users", tone: "text-warning" });
    tasks.push({ label: "Integrations not connected", count: integrations.filter((i) => i.status !== "connected").length, to: "/integrations", tone: "text-destructive" });
  }
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" /> My tasks · {role}</h3>
        {unread > 0 && <span className="text-xs text-accent">{unread} unread notification(s)</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks.map((t) => (
          <Link key={t.label} to={t.to} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3 transition hover:border-primary/40">
            <div><div className="text-xs text-muted-foreground">{t.label}</div><div className={`font-mono text-2xl font-semibold ${t.tone}`}>{t.count}</div></div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
