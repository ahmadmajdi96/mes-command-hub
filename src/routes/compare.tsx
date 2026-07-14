import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { useRms } from "@/lib/rms-store";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Comparison Engine · Cortanex RMS" }, { name: "description", content: "Side-by-side sandbox to analyze deviations between recipe variants." }] }),
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
  const [aId, setAId] = useState(recipes[0].id);
  const [bId, setBId] = useState(recipes[1]?.id ?? recipes[0].id);
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
      ...Array.from(map.values()),
      ...processRows,
    ];
  }, [A, B]);

  const rowTone = (r: Row) => {
    if (r.a === undefined) return "border-l-2 border-success/60 bg-success/5";
    if (r.b === undefined) return "border-l-2 border-destructive/60 bg-destructive/5";
    if (r.a !== r.b) return "border-l-2 border-warning/60 bg-warning/5";
    return "";
  };

  const delta = (a?: number, b?: number) => {
    if (a === undefined || b === undefined || a === 0) return "—";
    return `${(((b - a) / a) * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Comparison Engine</h1>
          <p className="text-sm text-muted-foreground">3-column side-by-side deviation grid with computed Δ%.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={exploded} onChange={(e) => setExploded(e.target.checked)} className="accent-primary" />
            Exploded view (flatten sub-recipes)
          </label>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Instantiate Variant C
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[{ v: "A", id: aId, set: setAId }, { v: "B", id: bId, set: setBId }].map((slot) => {
          const r = recipes.find((x) => x.id === slot.id)!;
          return (
            <div key={slot.v} className="glass-panel rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-primary">Variant {slot.v}</span>
                <select value={slot.id} onChange={(e) => slot.set(e.target.value)} className="rounded-md border border-border/60 bg-card/60 px-2 py-1 text-xs">
                  {recipes.map((rr) => <option key={rr.id} value={rr.id}>{rr.code} · {rr.version}</option>)}
                </select>
              </div>
              <div className="text-sm font-semibold">{r.name}</div>
              <div className="text-[11px] text-muted-foreground">{r.project} · {r.classification} · yield {r.targetYield.value}{r.targetYield.unit}</div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="text-sm font-semibold">Deviation grid</h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success" />Added</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive" />Removed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-warning" />Modified</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-8"></th>
              <th className="py-2 pl-3 pr-4 font-medium">Attribute / Component</th>
              <th className="py-2 pr-4 font-medium text-right">Variant A</th>
              <th className="w-8"></th>
              <th className="py-2 pr-4 font-medium text-right">Variant B</th>
              <th className="py-2 pr-4 font-medium text-right">Δ absolute</th>
              <th className="py-2 pr-4 font-medium text-right">Δ %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={`border-t border-border/40 ${rowTone(r)}`}>
                <td><input type="checkbox" className="ml-3 accent-primary" /></td>
                <td className="py-2 pl-3 pr-4">
                  <div>{r.label}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.kind}</div>
                </td>
                <td className="py-2 pr-4 text-right font-mono">{r.a !== undefined ? `${r.a}${r.unit ?? ""}` : "—"}</td>
                <td className="text-center text-muted-foreground"><ArrowLeftRight className="mx-auto h-3 w-3" /></td>
                <td className="py-2 pr-4 text-right font-mono">{r.b !== undefined ? `${r.b}${r.unit ?? ""}` : "—"}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{r.a !== undefined && r.b !== undefined ? (r.b - r.a).toFixed(4) : "—"}</td>
                <td className="py-2 pr-4 text-right font-mono">{delta(r.a, r.b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
