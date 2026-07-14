import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import type { UnitDef } from "@/lib/rms-data";

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units & Conversions · Cortanex RMS" }, { name: "description", content: "Universal conversion engine spanning mass, volume, counts and discretes." }] }),
  component: Units,
});

function Units() {
  const { units } = useRms();
  const dims = Array.from(new Set(units.map((u) => u.dimension)));
  const [amount, setAmount] = useState<number>(1);
  const [from, setFrom] = useState<UnitDef>(units[0]);
  const [to, setTo] = useState<UnitDef>(units[1]);

  const convert = () => {
    if (from.dimension !== to.dimension) return NaN;
    return (amount * from.baseMultiplier) / to.baseMultiplier;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Units &amp; Conversions</h1>
          <p className="text-sm text-muted-foreground">User-defined multipliers across Mass, Volume, Count and Discrete dimensions.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> New unit
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold">Live conversion sandbox</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
          <label className="text-xs">Amount
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 font-mono text-sm" />
          </label>
          <label className="text-xs">From
            <select value={from.id} onChange={(e) => setFrom(units.find((u) => u.id === e.target.value)!)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
              {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol}) · {u.dimension}</option>)}
            </select>
          </label>
          <ArrowRight className="mb-2 hidden h-5 w-5 self-end text-muted-foreground md:block" />
          <label className="text-xs">To
            <select value={to.id} onChange={(e) => setTo(units.find((u) => u.id === e.target.value)!)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
              {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol}) · {u.dimension}</option>)}
            </select>
          </label>
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Result</div>
            <div className="font-mono text-lg font-semibold text-primary">{Number.isFinite(convert()) ? convert().toFixed(4) : "N/A — different dimensions"}</div>
          </div>
        </div>
      </div>

      {dims.map((d) => (
        <div key={d} className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold">{d}</h3>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium">Unit</th>
                <th className="py-1.5 pr-3 font-medium">Symbol</th>
                <th className="py-1.5 pr-3 font-medium">Multiplier → base</th>
                <th className="py-1.5 pr-3 font-medium">ID</th>
              </tr>
            </thead>
            <tbody>
              {units.filter((u) => u.dimension === d).map((u) => (
                <tr key={u.id} className="border-t border-border/40">
                  <td className="py-2 pr-3">{u.name}</td>
                  <td className="py-2 pr-3 font-mono">{u.symbol}</td>
                  <td className="py-2 pr-3 font-mono text-primary">{u.baseMultiplier}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">{u.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
