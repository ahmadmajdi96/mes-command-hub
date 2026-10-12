import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Search, Printer, Expand, ArrowLeft, ArrowRight, List, AlertTriangle, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { documentationSections, type DocumentationSection, type DocumentationGroup } from "@/lib/documentation/content";
import { documentationScreenshots } from "@/lib/documentation/screenshots";
import { documentationDiagrams } from "@/lib/documentation/diagrams";
import { WorkflowDiagram } from "@/components/workflow-diagram";

export const Route = createFileRoute("/documentation")({
  validateSearch: (search: Record<string, unknown>): { chapter?: string } => ({
    chapter: typeof search.chapter === "string" && documentationSections.some((s) => s.id === search.chapter) ? search.chapter : undefined,
  }),
  head: () => ({ meta: [
    { title: "Technical Documentation · Cortanex RMS" },
    { name: "description", content: "The Cortanex RMS technical handbook: illustrated workflows, roles, recipe lifecycle, batch measurements, AI review, database dictionary and MES/QMS API contracts." },
    { property: "og:title", content: "Technical Documentation · Cortanex RMS" },
    { property: "og:description", content: "Illustrated workflows and source-grounded technical reference for Cortanex recipe management, quality review and production execution." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Documentation,
});

const groups: DocumentationGroup[] = ["Foundation", "Workflows", "Technical", "Operations"];

function Chapter({ section, onExpand }: { section: DocumentationSection; onExpand: (section: DocumentationSection) => void }) {
  const screenshot = section.image ? documentationScreenshots[section.image] : undefined;
  return (
    <article id={`chapter-${section.id}`} className="docs-chapter min-w-0 space-y-7">
      <header className="border-b border-border pb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase text-primary">
          <span>{section.group}</span><span className="text-muted-foreground">/</span><span>{section.id}</span>
        </div>
        <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{section.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.summary}</p>
        {section.path && <p className="mt-2 break-all font-mono text-xs text-primary">Screen: {section.path}</p>}
      </header>
      {section.paragraphs.length > 0 && <div className="space-y-4">{section.paragraphs.map((p, i) => <p key={i} className="break-words text-sm leading-7 text-foreground/90">{p}</p>)}</div>}
      {documentationDiagrams[section.id] && <WorkflowDiagram diagram={documentationDiagrams[section.id]!} />}
      {section.steps.length > 0 && <section aria-label="Workflow steps">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><List className="h-4 w-4 text-primary" />Step-by-step workflow</h3>
        <ol className="space-y-0">{section.steps.map((step, i) => <li key={i} className="grid grid-cols-[32px_1fr] gap-3 border-t border-border/60 py-4 first:border-t-0 first:pt-0">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
          <p className="min-w-0 break-words text-sm leading-7 text-foreground/90">{step}</p>
        </li>)}</ol>
      </section>}
      {section.fields.length > 0 && <section aria-label="Technical reference">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-info" />Reference & controls</h3>
        <dl className="divide-y divide-border border-y border-border">{section.fields.map(([key, value]) => <div key={key} className="grid gap-2 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-5">
          <dt className="break-words font-mono text-xs leading-6 text-primary">{key}</dt>
          <dd className="min-w-0 break-words text-sm leading-6 text-muted-foreground">{value}</dd>
        </div>)}</dl>
      </section>}
      {screenshot && <figure className="docs-figure space-y-3">
        <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Screen reference</h3>
          <Button variant="ghost" size="sm" aria-label={`Enlarge ${section.title} screenshot`} onClick={() => onExpand(section)}><Expand /><span>Enlarge</span></Button>
        </div>
        <div className="max-h-[520px] overflow-y-auto rounded-lg border border-border bg-background">
          <img src={screenshot} alt={`${section.title} — actual Cortanex RMS screen capture`} loading="lazy" className="h-auto w-full" />
        </div>
        <figcaption className="text-xs leading-5 text-muted-foreground">Figure {documentationSections.indexOf(section) + 1}. {section.title}. Captured 12 October 2026; shown records illustrate the current interface.</figcaption>
      </figure>}
      {section.notes.length > 0 && <aside className="border-l-2 border-warning pl-4" aria-label="Implementation boundaries">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="h-4 w-4" />Important boundaries</h3>
        <ul className="list-disc space-y-2 pl-4 text-xs leading-6 text-muted-foreground">{section.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
      </aside>}
    </article>
  );
}

function Documentation() {
  const { chapter } = Route.useSearch();
  const navigate = useNavigate({ from: "/documentation" });
  const [query, setQuery] = useState("");
  const [full, setFull] = useState(false);
  const [expanded, setExpanded] = useState<DocumentationSection | null>(null);
  const current = documentationSections.find((s) => s.id === chapter) ?? documentationSections[0];
  const filtered = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return documentationSections.filter((s) => {
      const haystack = [s.title, s.summary, ...s.paragraphs, ...s.steps, ...s.notes, ...s.fields.flat()].join(" ").toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [query]);
  if (!current) return null;
  const index = documentationSections.indexOf(current);
  const select = (s: DocumentationSection) => {
    setFull(false);
    navigate({ search: { chapter: s.id } });
    document.getElementById("docs-reading")?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  return (
    <div className="docs-root mx-auto max-w-[1440px]">
      <header className="docs-header mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase text-primary"><BookOpen className="h-4 w-4" />Cortanex RMS / Knowledge base</p>
          <h1 className="font-display text-3xl font-semibold">Technical Documentation</h1>
          <p className="mt-2 text-xs text-muted-foreground">33 chapters · Workflow diagrams · Illustrated workflows · Reviewed 12 October 2026</p>
        </div>
        <div className="docs-actions flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setFull((v) => !v)} aria-pressed={full}><BookOpen />{full ? "Chapter view" : "Full handbook"}</Button>
          <Button variant="outline" size="icon" title="Print documentation" aria-label="Print documentation" onClick={() => window.print()}><Printer /></Button>
        </div>
      </header>
      <div className="docs-layout grid items-start gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="docs-toc min-w-0 xl:sticky xl:top-20" aria-label="Documentation contents">
          <div className="relative mb-4"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search documentation" placeholder="Search handbook…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-10 pl-9 pr-9" />
            {query && <Button variant="ghost" size="icon" aria-label="Clear documentation search" className="absolute right-1 top-0.5 h-9 w-8" onClick={() => setQuery("")}><X /></Button>}
          </div>
          <div className="max-h-80 overflow-y-auto pr-1 xl:max-h-[calc(100vh-240px)]">
            {query && <p role="status" className="mb-3 text-xs text-muted-foreground">{filtered.length} matching chapters</p>}
            {groups.map((group) => {
              const items = filtered.filter((s) => s.group === group);
              return items.length === 0 ? null : <nav key={group} aria-label={`${group} chapters`} className="mb-5">
                <h2 className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">{group}</h2>
                <ul className="space-y-1">{items.map((s) => <li key={s.id}><Button variant="ghost" onClick={() => select(s)} aria-current={!full && s.id === current.id ? "page" : undefined} className={`h-auto min-h-9 w-full justify-start whitespace-normal px-2 py-2 text-left text-xs leading-5 ${!full && s.id === current.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                  <span className="min-w-0">{s.title}</span>
                </Button></li>)}</ul>
              </nav>;
            })}
            {filtered.length === 0 && <p className="py-6 text-sm text-muted-foreground">No matching chapters.</p>}
          </div>
        </aside>
        <div id="docs-reading" className="min-w-0 scroll-mt-20 xl:max-w-4xl">
          {!full && <div className="docs-single"><Chapter key={current.id} section={current} onExpand={setExpanded} /></div>}
          <div className={full ? "docs-all space-y-16" : "docs-all hidden"}>{documentationSections.map((s) => <Chapter key={s.id} section={s} onExpand={setExpanded} />)}</div>
          {!full && <footer className="docs-pagination mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button variant="outline" size="sm" disabled={index === 0} onClick={() => { const prev = documentationSections[index - 1]; if (prev) select(prev); }}><ArrowLeft />Previous</Button>
            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")} / {documentationSections.length}</span>
            <Button variant="outline" size="sm" disabled={index === documentationSections.length - 1} onClick={() => { const next = documentationSections[index + 1]; if (next) select(next); }}>Next<ArrowRight /></Button>
          </footer>}
        </div>
      </div>
      <Dialog open={expanded !== null} onOpenChange={(open) => { if (!open) setExpanded(null); }}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-y-auto">
          <DialogTitle>{expanded?.title}</DialogTitle>
          <DialogDescription>Actual screen reference · 12 October 2026</DialogDescription>
          {expanded?.image && <img src={documentationScreenshots[expanded.image]} alt={`${expanded.title} — enlarged screen reference`} className="h-auto w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}