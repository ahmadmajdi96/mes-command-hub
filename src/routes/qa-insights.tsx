import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { summarizeDeviations } from "@/lib/qa-insights.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/qa-insights")({
  head: () => ({
    meta: [
      { title: "QA Deviation Insights — RMS" },
      { name: "description", content: "AI summary of out-of-spec batch trends with draft investigation questions for QA." },
      { property: "og:title", content: "QA Deviation Insights — RMS" },
      { property: "og:description", content: "AI-assisted review of batch measurements and deviation notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QaInsights,
});

function renderMd(md: string) {
  return md.split("\n").map((l, i) => {
    if (l.startsWith("## ")) return <h3 key={i} className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{l.slice(3)}</h3>;
    const t = l.replace(/\*\*(.+?)\*\*/g, "$1");
    if (/^\s*[-*] /.test(l)) return <li key={i} className="ml-5 list-disc text-sm text-foreground/90">{t.replace(/^\s*[-*] /, "")}</li>;
    if (/^\s*\d+\. /.test(l)) return <li key={i} className="ml-5 list-decimal text-sm text-foreground/90">{t.replace(/^\s*\d+\. /, "")}</li>;
    return l.trim() ? <p key={i} className="text-sm text-foreground/90">{t}</p> : null;
  });
}

function QaInsights() {
  const { recipes, executions } = useRms() as any;
  const run = useServerFn(summarizeDeviations);
  const [recipeId, setRecipeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ text?: string; error?: string; batchCount?: number } | null>(null);
  const list = (executions ?? []) as any[];
  const flagged = list.filter((e) => e.qcStatus === "failed" || (e.steps ?? []).some((s: any) => s.deviation)).length;

  const go = async () => {
    setBusy(true); setOut(null);
    try { setOut(await run({ data: { recipeId: recipeId || undefined } })); }
    catch (e: any) { setOut({ error: e?.message ?? "Request failed" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">QA Deviation Insights</h1>
        <p className="text-sm text-muted-foreground">Operators record measurements and deviation notes in each batch run. AI summarizes out-of-spec trends and drafts questions for QA review.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Batch records</div><div className="text-2xl font-semibold">{list.length}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">With deviations / QC fail</div><div className="text-2xl font-semibold text-warning">{flagged}</div></div>
        <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Model</div><div className="text-sm font-medium">Lovable AI</div></div>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="text-xs text-muted-foreground">Recipe
          <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
            <option value="">All recipes</option>
            {(recipes ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.code} {r.version}</option>)}
          </select>
        </label>
        <Button onClick={go} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Analyze batches</Button>
      </div>
      {out?.error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{out.error}</div>}
      {out?.text && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Based on {out.batchCount} batch records · AI draft — verify before acting</div>
          {renderMd(out.text)}
        </div>
      )}
    </div>
  );
}
