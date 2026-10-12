import { ArrowDown, GitBranch } from "lucide-react";
import type { WorkflowDiagram as Diagram, DiagramNodeKind } from "@/lib/documentation/diagrams";

const kindClass: Record<DiagramNodeKind, string> = {
  start: "border-primary/60 bg-primary/10",
  step: "border-border bg-card/60",
  decision: "border-warning/60 bg-warning/10",
  system: "border-info/50 bg-info/10 border-dashed",
  end: "border-success/60 bg-success/10",
};

export function WorkflowDiagram({ diagram }: { diagram: Diagram }) {
  return (
    <figure className="docs-figure space-y-3" aria-label={`${diagram.title} workflow diagram`}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><GitBranch className="h-4 w-4 text-primary" />Workflow diagram · {diagram.title}</h3>
      <div className="rounded-lg border border-border bg-background/40 p-4">
        <ol className="flex flex-col items-stretch sm:items-center">
          {diagram.nodes.map((node, i) => {
            const kind = node.kind ?? "step";
            return (
              <li key={i} className="flex w-full flex-col items-center">
                <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-start">
                  <div className={`flex-1 border px-3 py-2 ${kind === "decision" ? "rounded-xl" : kind === "start" || kind === "end" ? "rounded-full" : "rounded-md"} ${kindClass[kind]}`}>
                    <div className="text-sm font-medium leading-5">{kind === "decision" ? "◇ " : ""}{node.label}</div>
                    {node.actor && <div className="font-mono text-[10px] uppercase text-muted-foreground">{node.actor}</div>}
                  </div>
                  {node.alt && node.alt.length > 0 && (
                    <ul className="space-y-1 sm:w-56">
                      {node.alt.map((a) => <li key={a} className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs leading-5 text-muted-foreground">↳ {a}</li>)}
                    </ul>
                  )}
                </div>
                {i < diagram.nodes.length - 1 && <ArrowDown className="my-1 h-4 w-4 text-muted-foreground" aria-hidden />}
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
          <span>● Start/End</span><span className="text-warning">◇ Decision</span><span className="text-info">┆ System step</span><span className="text-destructive">↳ Alternate path</span>
        </div>
      </div>
    </figure>
  );
}
