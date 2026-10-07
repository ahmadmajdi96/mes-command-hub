import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, FileJson, FileSpreadsheet, FileCode, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRms } from "@/lib/rms-store";
import type { Recipe } from "@/lib/rms-data";

export const Route = createFileRoute("/data-exchange")({
  head: () => ({ meta: [
    { title: "Import & Export · Cortanex RMS" },
    { name: "description", content: "Import and export recipes as CSV, Excel, JSON or XML." },
    { property: "og:title", content: "Import & Export · Cortanex RMS" },
    { property: "og:description", content: "Move recipe data in and out of RMS in CSV, Excel, JSON and XML formats." },
  ] }),
  component: DataExchange,
});

type Fmt = "csv" | "xlsx" | "json" | "xml";

function toCsv(rs: Recipe[]) {
  const head = "recipe_id,code,name,version,status,item_ref,item_name,target_pct,min_pct,max_pct,unit";
  const rows = rs.flatMap((r) => r.items.map((i) => [r.id, r.code, `"${r.name}"`, r.version, r.status, i.refId, `"${i.name}"`, i.targetPct, i.minPct, i.maxPct, i.unit].join(",")));
  return [head, ...rows].join("\n");
}
function toXml(rs: Recipe[]) {
  return `<?xml version="1.0"?>\n<recipes>\n${rs.map((r) => `  <recipe id="${r.id}" code="${r.code}" version="${r.version}" status="${r.status}">\n${r.items.map((i) => `    <item ref="${i.refId}" pct="${i.targetPct}" unit="${i.unit}"/>`).join("\n")}\n  </recipe>`).join("\n")}\n</recipes>`;
}

function DataExchange() {
  const { recipes, can, importRecipes, logAudit } = useRms();
  const [scope, setScope] = useState<"all" | "released">("released");
  const fileRef = useRef<HTMLInputElement>(null);
  const canExport = can("data.export");
  const canImport = can("data.import");
  const list = scope === "all" && can("recipe.viewDraft") ? recipes : recipes.filter((r) => r.status === "released");

  const exportAs = async (fmt: Fmt) => {
    let blob: Blob;
    if (fmt === "xlsx") {
      // Excel-compatible tab-separated sheet
      blob = new Blob([toCsv(list).replace(/,/g, "\t")], { type: "application/vnd.ms-excel" });
    } else if (fmt === "csv") blob = new Blob([toCsv(list)], { type: "text/csv" });
    else if (fmt === "json") blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    else blob = new Blob([toXml(list)], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rms_recipes.${fmt === "xlsx" ? "xls" : fmt}`; a.click();
    logAudit({ action: "EXPORT", entity: "recipes", property: "format", before: scope, after: `${fmt} (${list.length})` });
    toast.success(`Exported ${list.length} recipes as ${fmt.toUpperCase()}`);
  };

  const onFile = async (f: File) => {
    const text = await f.text();
    try {
      if (f.name.endsWith(".json")) {
        const arr = JSON.parse(text);
        const rs = (Array.isArray(arr) ? arr : [arr]) as Recipe[];
        if (!rs.every((r) => r.code && r.name && Array.isArray(r.items))) throw new Error("Missing code/name/items");
        toast.success(`Imported ${importRecipes(rs)} recipes as drafts`);
      } else if (f.name.endsWith(".csv") || f.name.endsWith(".xls") || f.name.endsWith(".tsv")) {
        const sep = text.includes("\t") ? "\t" : ",";
        const lines = text.trim().split(/\r?\n/).slice(1).map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "")));
        const map = new Map<string, Recipe>();
        lines.forEach(([, code, name, version, , ref, iname, t, mn, mx, unit], idx) => {
          const r = map.get(code) ?? { id: "", code, name, version: version || "v1.0", project: "Imported", status: "draft", classification: "Imported", targetYield: { value: 100, unit: "kg" }, items: [], process: [], compliance: { hazards: [], allergens: [], storageMaxC: 25, shelfLifeDays: 0 }, createdBy: "", approvedBy: [], updatedAt: "" } as Recipe;
          r.items.push({ id: `imp${idx}`, refType: "material", refId: ref, name: iname, targetPct: +t, minPct: +mn, maxPct: +mx, unit, scaling: "proportional" });
          map.set(code, r);
        });
        toast.success(`Imported ${importRecipes([...map.values()])} recipes as drafts`);
      } else if (f.name.endsWith(".xml")) {
        const doc = new DOMParser().parseFromString(text, "application/xml");
        const rs = [...doc.querySelectorAll("recipe")].map((n, k) => ({
          id: "", code: n.getAttribute("code") ?? `XML-${k}`, name: n.getAttribute("code") ?? "Imported", version: n.getAttribute("version") ?? "v1.0", project: "Imported", status: "draft", classification: "Imported",
          targetYield: { value: 100, unit: "kg" }, process: [], compliance: { hazards: [], allergens: [], storageMaxC: 25, shelfLifeDays: 0 }, createdBy: "", approvedBy: [], updatedAt: "",
          items: [...n.querySelectorAll("item")].map((i, j) => ({ id: `x${j}`, refType: "material" as const, refId: i.getAttribute("ref") ?? "", name: i.getAttribute("ref") ?? "", targetPct: +(i.getAttribute("pct") ?? 0), minPct: +(i.getAttribute("pct") ?? 0), maxPct: +(i.getAttribute("pct") ?? 0), unit: i.getAttribute("unit") ?? "kg", scaling: "proportional" as const })),
        })) as Recipe[];
        toast.success(`Imported ${importRecipes(rs)} recipes as drafts`);
      } else toast.error("Unsupported file type");
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`);
    }
  };

  const formats: { fmt: Fmt; label: string; icon: typeof FileJson }[] = [
    { fmt: "csv", label: "CSV", icon: FileSpreadsheet }, { fmt: "xlsx", label: "Excel", icon: FileSpreadsheet },
    { fmt: "json", label: "JSON", icon: FileJson }, { fmt: "xml", label: "XML", icon: FileCode },
  ];

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Data exchange</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Import &amp; Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">Imported recipes always enter as Draft and must pass validation and approval.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4 text-primary" /> Export</h3>
          <div className="mt-3 flex gap-2 text-xs">
            {(["released", "all"] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={`rounded-md border px-3 py-1 ${scope === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"}`}>{s === "all" ? "All recipes" : "Released only"}</button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{list.length} recipes in scope</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {formats.map((f) => (
              <button key={f.fmt} disabled={!canExport} onClick={() => exportAs(f.fmt)} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-3 text-xs hover:border-primary/40 hover:text-primary disabled:opacity-40">
                <f.icon className="h-4 w-4" /> {f.label}
              </button>
            ))}
          </div>
          {!canExport && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> Your role cannot export</p>}
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Upload className="h-4 w-4 text-primary" /> Import</h3>
          <button disabled={!canImport} onClick={() => fileRef.current?.click()} className="mt-3 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 p-8 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40">
            <Upload className="h-6 w-6" /> Choose CSV, Excel (.xls/.tsv), JSON or XML file
          </button>
          <input ref={fileRef} type="file" accept=".csv,.xls,.tsv,.json,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          {!canImport && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> Your role cannot import</p>}
        </div>
      </div>
    </div>
  );
}
