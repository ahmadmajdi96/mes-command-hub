import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Plus, Repeat, Ruler, Scale, Boxes, Hash } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import type { UnitDef } from "@/lib/rms-data";

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units & Conversions · Cortanex RMS" }, { name: "description", content: "Universal conversion engine spanning mass, volume, counts and discretes." }] }),
  component: Units,
});

const dimIcon = (d: string) => d === "Mass" ? Scale : d === "Volume" ? Ruler : d === "Count" ? Hash : Boxes;
const dimTone = (d: string) => d === "Mass" ? "text-primary" : d === "Volume" ? "text-info" : d === "Count" ? "text-accent" : "text-success";

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

  const swap = () => { const t = from; setFrom(to); setTo(t); };
  const result = convert();
  const compatibleTo = units.filter((u) => u.dimension === from.dimension);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Conversion engine</div>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Units &amp; Conversions</h1>
            <p className="mt-1 text-sm text-muted-foreground">User-defined multipliers across Mass, Volume, Count and Discrete dimensions.</p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New unit
          </button>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-4">
          {dims.map((d) => {
            const Icon = dimIcon(d);
            const tone = dimTone(d);
            const count = units.filter((u) => u.dimension === d).length;
            return (
              <div key={d} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d}</div>
                  <Icon className={`h-3.5 w-3.5 ${tone}`} />
                </div>
                <div className={`mt-1 font-mono text-xl font-semibold ${tone}`}>{count}</div>
                <div className="text-[10px] text-muted-foreground">units defined</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live conversion sandbox */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Live conversion sandbox</h3>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${from.dimension === to.dimension ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {from.dimension === to.dimension ? "compatible" : "dimension mismatch"}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] md:items-end">
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</div>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full bg-transparent font-mono text-xl font-semibold focus:outline-none" />
            <select value={from.id} onChange={(e) => setFrom(units.find((u) => u.id === e.target.value)!)}
              className="mt-2 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs">
              {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol}) · {u.dimension}</option>)}
            </select>
          </div>
          <button onClick={swap} title="Swap" className="grid h-11 w-11 place-items-center self-center rounded-full border border-border/60 bg-card/60 text-muted-foreground transition hover:border-primary/50 hover:text-primary">
            <Repeat className="h-4 w-4" />
          </button>
          <div className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Convert to</div>
            <div className="mt-1 font-mono text-xl font-semibold text-muted-foreground">→</div>
            <select value={to.id} onChange={(e) => setTo(units.find((u) => u.id === e.target.value)!)}
              className="mt-2 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs">
              {compatibleTo.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
              {compatibleTo.length === 0 && <option>—</option>}
            </select>
          </div>
          <ArrowRight className="mb-4 hidden h-5 w-5 self-center text-muted-foreground md:block" />
          <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Result</div>
            <div className="mt-1 font-mono text-2xl font-semibold text-primary text-glow">
              {Number.isFinite(result) ? result.toFixed(4) : "—"}
              {Number.isFinite(result) && <span className="ml-1 text-sm text-muted-foreground">{to.symbol}</span>}
            </div>
            {Number.isFinite(result) && (
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                {amount} {from.symbol} × {(from.baseMultiplier / to.baseMultiplier).toFixed(6)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dimension tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        {dims.map((d) => {
          const Icon = dimIcon(d);
          const tone = dimTone(d);
          const rows = units.filter((u) => u.dimension === d);
          const base = rows.reduce((a, u) => a.baseMultiplier < u.baseMultiplier ? a : u, rows[0]);
          return (
            <div key={d} className="glass-panel rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg bg-card/60 ${tone}`}><Icon className="h-4 w-4" /></div>
                  <div>
                    <h3 className="text-sm font-semibold">{d}</h3>
                    <div className="text-[10px] text-muted-foreground">{rows.length} units · base <span className={`font-mono ${tone}`}>{base?.symbol}</span></div>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Unit</th>
                    <th className="py-1.5 pr-3 font-medium">Symbol</th>
                    <th className="py-1.5 pr-3 font-medium text-right">→ base</th>
                    <th className="py-1.5 pr-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-t border-border/40 hover:bg-muted/10">
                      <td className="py-2 pr-3">{u.name}</td>
                      <td className="py-2 pr-3 font-mono">{u.symbol}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${tone}`}>{u.baseMultiplier}</td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
