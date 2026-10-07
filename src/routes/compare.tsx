import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Plus, Repeat, Download, Filter } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Comparison Engine · Cortanex RMS" }, { name: "description", content: "Side-by-side comparison of recipe versions with deltas." }, { property: "og:title", content: "Comparison Engine · Cortanex RMS" }, { property: "og:description", content: "Side-by-side comparison of recipe versions with deltas." }] }),
  component: Compare,
});

type Row = {
  key: string;
  label: string;
  a?: number;
  b?: number;
  unit?: string;
  kind: "component" | "process" | "meta";
};

function Compare() {
  const { recipes } = useRms();
  if (recipes.length < 2) return <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground">At least two recipe versions you can see are needed to compare.</div>;
  return <CompareInner />;
}

function CompareInner() {
  const { recipes } = useRms();
  const [aId, setAId] = useState(recipes[0].id);
  const [bId, setBId] = useState(recipes[1]?.id ?? recipes[0].id);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [exploded, setExploded] = useState(false);

  const A = recipes.find((r) => r.id === aId)!;
  const B = recipes.find((r) => r.id === bId)!;

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    A.items.forEach((it) => map.set(`c:${it.refId}`, { key: `c:${it.refId}`, label: it.name, a: it.targetPct, unit: "%", kind: "component" }));
    B.items.forEach((it) => {
      const k = `c:${it.refId}`;
      const row = map.get(k);
      if (row) row.b = it.targetPct;
      else map.set(k, { key: k, label: it.name, b: it.targetPct, unit: "%", kind: "component" });
    });
    const processRows: Row[] = [];
    const psA = A.process, psB = B.process;
    const maxLen = Math.max(psA.length, psB.length);
    for (let i = 0; i < maxLen; i++) {
      processRows.push({ key: `p:${i}`, label: `${psA[i]?.phase ?? psB[i]?.phase} · ${psA[i]?.parameter ?? psB[i]?.parameter}`, a: psA[i]?.targetValue, b: psB[i]?.targetValue, unit: psA[i]?.unit ?? psB[i]?.unit, kind: "process" });
    }
    return [
      { key: "m:yield", label: "Target yield", a: A.targetYield.value, b: B.targetYield.value, unit: A.targetYield.unit, kind: "meta" },
      { key: "m:shelf", label: "Shelf life (days)", a: A.compliance.shelfLifeDays, b: B.compliance.shelfLifeDays, unit: "d", kind: "meta" },
      { key: "m:storage", label: "Storage max °C", a: A.compliance.storageMaxC, b: B.compliance.storageMaxC, unit: "°C", kind: "meta" },
      ...Array.from(map.values()),
      ...processRows,
    ];
  }, [A, B]);

  const summary = useMemo(() => {
    let added = 0, removed = 0, modified = 0, same = 0;
    rows.forEach((r) => {
      if (r.a === undefined) added++;
      else if (r.b === undefined) removed++;
      else if (r.a !== r.b) modified++;
      else same++;
    });
    return { added, removed, modified, same };
  }, [rows]);

  const visibleRows = onlyDiff ? rows.filter((r) => r.a === undefined || r.b === undefined || r.a !== r.b) : rows;
  const groups: { title: string; kind: Row["kind"]; items: Row[] }[] = [
    { title: "Meta & compliance", kind: "meta", items: visibleRows.filter((r) => r.kind === "meta") },
    { title: "Components", kind: "component", items: visibleRows.filter((r) => r.kind === "component") },
    { title: "Process parameters", kind: "process", items: visibleRows.filter((r) => r.kind === "process") },
  ];

  const rowTone = (r: Row) => {
    if (r.a === undefined) return "border-l-2 border-success/60 bg-success/5";
    if (r.b === undefined) return "border-l-2 border-destructive/60 bg-destructive/5";
    if (r.a !== r.b) return "border-l-2 border-warning/60 bg-warning/5";
    return "border-l-2 border-transparent";
  };

  const delta = (a?: number, b?: number) => {
    if (a === undefined || b === undefined || a === 0) return "—";
    return `${(((b - a) / a) * 100).toFixed(2)}%`;
  };

  const swap = () => { const t = aId; setAId(bId); setBId(t); };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-warning/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-warning">Deviation analytics</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Comparison Engine</h1>
            <p className="mt-1 text-sm text-muted-foreground">Side-by-side deviation grid with computed Δ absolute and Δ%, grouped by concern.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => {
              const lines = [`item,kind,${A.code} ${A.version},${B.code} ${B.version},delta,unit`, ...rows.map((r) => [`"${r.label}"`, r.kind, r.a ?? "", r.b ?? "", r.a !== undefined && r.b !== undefined ? (r.b - r.a).toFixed(4) : "", r.unit ?? ""].join(","))];
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
              a.download = `compare_${A.code}_${A.version}_vs_${B.code}_${B.version}.csv`; a.click();
            }} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Instantiate Variant C
            </button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="relative mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Added in B", value: summary.added, tone: "bg-success/10 text-success" },
            { label: "Removed in B", value: summary.removed, tone: "bg-destructive/10 text-destructive" },
            { label: "Modified", value: summary.modified, tone: "bg-warning/10 text-warning" },
            { label: "Identical", value: summary.same, tone: "bg-muted/40 text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-1 inline-flex rounded-md px-2 py-0.5 font-mono text-xl font-semibold ${s.tone}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Variant selectors */}
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
        {[{ v: "A" as const, id: aId, set: setAId }, null, { v: "B" as const, id: bId, set: setBId }].map((slot, i) => {
          if (slot === null) {
            return (
              <div key="swap" className="flex items-center justify-center">
                <button onClick={swap} title="Swap A and B" className="grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-card/60 text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary">
                  <Repeat className="h-4 w-4" />
                </button>
              </div>
            );
          }
          const r = recipes.find((x) => x.id === slot.id)!;
          const tone = slot.v === "A" ? "border-primary/40 from-primary/10" : "border-info/40 from-info/10";
          return (
            <div key={i} className={`glass-panel rounded-2xl border ${tone} bg-gradient-to-br to-transparent p-4`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`font-mono text-[11px] uppercase tracking-wider ${slot.v === "A" ? "text-primary" : "text-info"}`}>Variant {slot.v}</span>
                <StatusPill status={r.status} />
              </div>
              <select value={slot.id} onChange={(e) => slot.set(e.target.value)}
                className="w-full rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-xs font-medium">
                {recipes.map((rr) => <option key={rr.id} value={rr.id}>{rr.code} · {rr.version} — {rr.name}</option>)}
              </select>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Yield</div>
                  <div className="font-mono text-[11px] font-medium">{r.targetYield.value}{r.targetYield.unit}</div>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Items</div>
                  <div className="font-mono text-[11px] font-medium">{r.items.length}</div>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Steps</div>
                  <div className="font-mono text-[11px] font-medium">{r.process.length}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">{r.project} · {r.classification}</div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="accent-primary" />
            <Filter className="h-3 w-3" /> Only differences
          </label>
          <label className="inline-flex items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" checked={exploded} onChange={(e) => setExploded(e.target.checked)} className="accent-primary" />
            Exploded view (flatten sub-recipes)
          </label>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success" />Added</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive" />Removed</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-warning" />Modified</span>
        </div>
      </div>

      {/* Grouped grid */}
      {groups.map((g) => (
        g.items.length === 0 ? null : (
          <div key={g.kind} className="glass-panel overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{g.items.length}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pl-4 pr-4 font-medium">Attribute / Component</th>
                  <th className="py-2 pr-4 font-medium text-right">Variant A</th>
                  <th className="w-8"></th>
                  <th className="py-2 pr-4 font-medium text-right">Variant B</th>
                  <th className="py-2 pr-4 font-medium text-right">Δ absolute</th>
                  <th className="py-2 pr-4 font-medium text-right">Δ %</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxAbs = Math.max(...g.items.map((x) => (x.a !== undefined && x.b !== undefined ? Math.abs((x.b as number) - (x.a as number)) : 0)), 1);
                  return g.items.map((r) => {
                    const both = r.a !== undefined && r.b !== undefined;
                    const diff = both ? (r.b as number) - (r.a as number) : 0;
                    const barPct = both ? Math.min((Math.abs(diff) / maxAbs) * 100, 100) : 0;
                    const barTone = diff > 0 ? "bg-success/60" : diff < 0 ? "bg-destructive/60" : "bg-muted-foreground/40";
                    return (
                      <tr key={r.key} className={`border-t border-border/40 ${rowTone(r)}`}>
                        <td className="py-2 pl-4 pr-4">
                          <div className="font-medium">{r.label}</div>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">{r.a !== undefined ? `${r.a}${r.unit ?? ""}` : <span className="text-success">＋ new</span>}</td>
                        <td className="text-center text-muted-foreground"><ArrowLeftRight className="mx-auto h-3 w-3" /></td>
                        <td className="py-2 pr-4 text-right font-mono">{r.b !== undefined ? `${r.b}${r.unit ?? ""}` : <span className="text-destructive">− removed</span>}</td>
                        <td className="py-2 pr-4">
                          {both && diff !== 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/40">
                                <div className={`h-full ${barTone}`} style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="w-16 text-right font-mono text-xs text-muted-foreground">{diff > 0 ? "+" : ""}{diff.toFixed(3)}</span>
                            </div>
                          ) : <div className="text-right font-mono text-muted-foreground">—</div>}
                        </td>
                        <td className={`py-2 pr-4 text-right font-mono ${both && r.a !== r.b ? (diff > 0 ? "text-success" : "text-destructive") : "text-muted-foreground"}`}>{delta(r.a, r.b)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )
      ))}
    </div>
  );
}
