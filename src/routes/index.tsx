import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line as RLine, LineChart,
  Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, Beaker, CheckCircle2, FlaskConical, GitBranch, KeyRound, Package,
  ShieldAlert, Workflow,
} from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { activityTrend, rmsKpis, recipeCost, statusLabel } from "@/lib/rms-data";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "R&D Control Center · Cortanex RMS" },
      { name: "description", content: "Overview of active recipes, pipeline gates, trial outcomes and API activity across R&D projects." },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = {
  background: "oklch(0.16 0.02 240 / 0.95)",
  border: "1px solid oklch(0.3 0.02 245)",
  borderRadius: 8,
  fontSize: 12,
};

function Kpi({ label, value, delta, icon: Icon, accent = "primary", suffix }: {
  label: string; value: string | number; delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "info" | "accent";
  suffix?: string;
}) {
  const accentMap = {
    primary: "from-primary/20 to-primary/0 text-primary",
    success: "from-success/20 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-warning",
    info: "from-info/20 to-info/0 text-info",
    accent: "from-accent/20 to-accent/0 text-accent",
  } as const;
  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${accentMap[accent]} opacity-60`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accentMap[accent].split(" ").pop()}`} />
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-mono text-3xl font-semibold tracking-tight">{value}</span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
        {delta && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ArrowUpRight className="h-3 w-3 text-success" />
            <span>{delta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { recipes, materials, trials, audit, apiKeys } = useRms();
  const activeGates = recipes.filter((r) => ["review", "approved"].includes(r.status));
  const passRate = Math.round((trials.filter((t) => t.outcome === "pass").length / trials.length) * 100);

  const gateDist = [
    { name: "Draft", value: recipes.filter((r) => r.status === "draft").length, color: "oklch(0.72 0.14 230)" },
    { name: "Under Review", value: recipes.filter((r) => r.status === "review").length, color: "oklch(0.82 0.17 80)" },
    { name: "Approved", value: recipes.filter((r) => r.status === "approved").length, color: "oklch(0.78 0.18 75)" },
    { name: "Rejected", value: recipes.filter((r) => r.status === "rejected").length, color: "oklch(0.78 0.16 195)" },
    { name: "Released", value: recipes.filter((r) => r.status === "released").length, color: "oklch(0.72 0.18 155)" },
    { name: "Superseded / Obsolete", value: recipes.filter((r) => ["superseded", "obsolete"].includes(r.status)).length, color: "oklch(0.65 0.24 22)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">R&amp;D Control Center</h1>
          <p className="text-sm text-muted-foreground">Sandbox formulation · trial outcomes · governance signals</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/recipes" className="rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs">Open recipes</Link>
          <Link to="/compare" className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">Comparison engine</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi label="Recipes" value={rmsKpis.totalRecipes} icon={FlaskConical} accent="primary" delta={`${rmsKpis.released} released`} />
        <Kpi label="In pipeline" value={rmsKpis.inReview} icon={Workflow} accent="warning" delta="across 3 gates" />
        <Kpi label="Materials" value={materials.length} icon={Package} accent="info" />
        <Kpi label="Trials" value={trials.length} icon={Beaker} accent="accent" delta={`${passRate}% pass rate`} />
        <Kpi label="Active API keys" value={apiKeys.filter(k => k.active).length} icon={KeyRound} accent="success" />
        <Kpi label="Abandoned" value={rmsKpis.failed} icon={ShieldAlert} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">R&amp;D activity — last 12 days</h3>
              <p className="text-xs text-muted-foreground">Drafts opened · trials logged · releases signed</p>
            </div>
            <div className="flex gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" />Drafts</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" />Trials</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success" />Releases</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={activityTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 245 / 0.4)" />
                <XAxis dataKey="day" stroke="oklch(0.68 0.02 245)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.02 245)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="drafts" stroke="oklch(0.78 0.16 195)" fill="url(#g1)" strokeWidth={2} />
                <RLine type="monotone" dataKey="trials" stroke="oklch(0.82 0.17 80)" strokeWidth={1.5} dot={false} />
                <RLine type="monotone" dataKey="releases" stroke="oklch(0.72 0.18 155)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold">Pipeline health</h3>
          <p className="text-xs text-muted-foreground">Overall release progression</p>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="60%" outerRadius="95%" data={[{ name: "released", value: Math.round((rmsKpis.released / rmsKpis.totalRecipes) * 100), fill: "oklch(0.78 0.16 195)" }]} startAngle={210} endAngle={-30}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: "oklch(0.25 0.02 245)" }} cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-semibold text-glow">{Math.round((rmsKpis.released / rmsKpis.totalRecipes) * 100)}%</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">released ratio</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-panel rounded-2xl p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Recipes in gate flow</h3>
              <p className="text-xs text-muted-foreground">{activeGates.length} awaiting review</p>
            </div>
            <Link to="/workflows" className="text-xs text-primary hover:underline">Pipelines →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Recipe</th>
                  <th className="py-2 pr-4 font-medium">Project</th>
                  <th className="py-2 pr-4 font-medium">Gate</th>
                  <th className="py-2 pr-4 font-medium text-right">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {activeGates.map((r) => (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="py-3 pr-4">
                      <Link to="/recipes/$id" params={{ id: r.id }} className="hover:underline">
                        <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                        <span className="ml-2 font-medium">{r.name} {r.version}</span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.project}</td>
                    <td className="py-3 pr-4"><StatusPill status={r.status} /></td>
                    <td className="py-3 pr-4 text-right font-mono">${recipeCost(r, materials).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold">Gate distribution</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={gateDist} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {gateDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {gateDist.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </span>
                <span className="font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Latest trial outcomes</h3>
              <p className="text-xs text-muted-foreground">Bench execution snapshot</p>
            </div>
            <Link to="/trials" className="text-xs text-primary hover:underline">All trials →</Link>
          </div>
          <div className="space-y-2">
            {trials.slice(0, 4).map((t) => (
              <div key={t.id} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{t.id} · {t.batchCode}</span>
                  <StatusPill status={t.outcome} />
                </div>
                <p className="mt-1 text-sm font-medium">{t.recipeName}</p>
                <p className="text-[11px] text-muted-foreground">{t.observation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Recent audit events</h3>
              <p className="text-xs text-muted-foreground">Atomic field-level trail</p>
            </div>
            <Link to="/audit" className="text-xs text-primary hover:underline">Full trail →</Link>
          </div>
          <div className="space-y-1.5">
            {audit.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-md border border-border/40 bg-card/40 px-3 py-2 text-[11px]">
                <span className="font-mono text-muted-foreground">{a.ts.slice(5, 16)}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">{a.action}</span>
                <span className="min-w-0 flex-1 truncate">{a.entity} · {a.property}</span>
                <span className="text-muted-foreground">{a.user}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold">Gate transitions (recipes released this quarter)</h3>
        <div className="mt-3 h-48">
          <ResponsiveContainer>
            <BarChart data={activityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 245 / 0.4)" />
              <XAxis dataKey="day" stroke="oklch(0.68 0.02 245)" fontSize={11} />
              <YAxis stroke="oklch(0.68 0.02 245)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="releases" radius={[6, 6, 0, 0]} fill="oklch(0.72 0.18 155)" />
              <Bar dataKey="drafts" radius={[6, 6, 0, 0]} fill="oklch(0.78 0.16 195)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-medium">Branching enabled</div>
            <p className="text-xs text-muted-foreground">Baseline recipes split into parallel variants for testing.</p>
          </div>
        </div>
        <Link to="/branches" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Open variant tree</Link>
      </div>
    </div>
  );
}
