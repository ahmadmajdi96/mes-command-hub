import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, History as HistoryIcon, Search, Filter, User, ArrowRight, Shield } from "lucide-react";
import { useRms } from "@/lib/rms-store";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Audit Trail · Cortanex RMS" }, { name: "description", content: "Tamper-proof field-level audit trail." }, { property: "og:title", content: "Audit Trail · Cortanex RMS" }, { property: "og:description", content: "Tamper-proof field-level audit trail." }] }),
  component: Audit,
});

function Audit() {
  const { audit } = useRms();
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");

  const actions = Array.from(new Set(audit.map((a) => a.action)));
  const filtered = audit.filter((a) =>
    (action === "all" || a.action === action) &&
    (q === "" || (a.entity + a.user + a.action + a.property).toLowerCase().includes(q.toLowerCase()))
  );

  // group by date
  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, a) => {
    const d = a.ts.slice(0, 10);
    (acc[d] ||= []).push(a);
    return acc;
  }, {});

  const stats = {
    total: audit.length,
    users: new Set(audit.map((a) => a.user)).size,
    entities: new Set(audit.map((a) => a.entity)).size,
    today: audit.filter((a) => a.ts.startsWith(new Date().toISOString().slice(0, 10))).length,
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Immutable ledger</div>
            <button onClick={() => {
              const lines = ["time,user,action,entity,property,before,after,reason,version,signed", ...filtered.map((a) => [a.ts, a.user, a.action, a.entity, a.property, a.before, a.after, a.reason ?? "", a.version ?? "", a.signed ? "yes" : ""].map((v) => `"${String(v).replace(/"/g, "'").slice(0, 300)}"`).join(","))];
              const el = document.createElement("a");
              el.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
              el.download = `audit_${new Date().toISOString().slice(0, 10)}.csv`; el.click();
            }} className="float-right rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs hover:text-primary">Export CSV</button>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Audit Trail</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every atomic field change — decoupled, timestamped, tamper-evident.</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total events", value: stats.total, icon: HistoryIcon, tone: "text-primary" },
            { label: "Unique users", value: stats.users, icon: User, tone: "text-info" },
            { label: "Entities touched", value: stats.entities, icon: Shield, tone: "text-accent" },
            { label: "Events today", value: stats.today, icon: Filter, tone: "text-success" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <s.icon className={`h-3.5 w-3.5 ${s.tone}`} />
              </div>
              <div className="mt-1 font-mono text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by user, entity, property…"
            className="h-9 w-full rounded-lg border border-border/60 bg-card/60 pl-8 pr-3 text-sm focus:border-primary/50 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setAction("all")}
            className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${action === "all" ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>All actions</button>
          {actions.map((a) => (
            <button key={a} onClick={() => setAction(a)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] uppercase tracking-wider ${action === a ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card/60 text-muted-foreground"}`}>{a}</button>
          ))}
        </div>
      </div>

      {/* Timeline groups */}
      {Object.entries(groups).map(([date, events]) => (
        <div key={date} className="glass-panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-2.5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{date}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{events.length} events</span>
          </div>
          <div className="divide-y divide-border/30">
            {events.map((a) => (
              <div key={a.id} className="grid gap-3 px-5 py-3 hover:bg-muted/10 sm:grid-cols-[100px_140px_1fr_minmax(0,1fr)]">
                <div className="font-mono text-[11px] text-muted-foreground">{a.ts.slice(11)}</div>
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] text-primary">{a.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                  <span className="truncate text-xs">{a.user}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">{a.action}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{a.entity}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs">{a.property}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] text-destructive/80">{a.before}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">{a.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="glass-panel rounded-2xl p-10 text-center text-sm text-muted-foreground">
          <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <div className="mt-2">No audit events match your filters.</div>
        </div>
      )}
    </div>
  );
}
