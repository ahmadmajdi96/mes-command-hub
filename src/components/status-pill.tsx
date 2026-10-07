import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft: "text-info",
  review: "text-warning",
  rejected: "text-destructive",
  approved: "text-accent",
  released: "text-success",
  superseded: "text-muted-foreground",
  obsolete: "text-muted-foreground",
  completed: "text-success",
  running: "text-info",
  dispatched: "text-warning",
  aborted: "text-destructive",
  passed: "text-success",
  failed: "text-destructive",
  pending: "text-warning",
  connected: "text-success",
  degraded: "text-warning",
  disconnected: "text-destructive",
  active: "text-success",
  invited: "text-info",
  disabled: "text-muted-foreground",
  pass: "text-success",
  fail: "text-destructive",
  inconclusive: "text-warning",
  revoked: "text-destructive",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const c = styles[status] ?? "text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        c,
        className,
      )}
    >
      <span className={cn("status-dot", c, (status === "active" || status === "released") && "animate-pulse-glow")} />
      {({ review: "under review" } as Record<string, string>)[status] ?? status}
    </span>
  );
}
