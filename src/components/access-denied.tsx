import { ShieldX } from "lucide-react";
import { useRms } from "@/lib/rms-store";

export function AccessDenied({ what }: { what: string }) {
  const { role } = useRms();
  return (
    <div className="glass-panel mx-auto mt-10 max-w-md rounded-2xl p-6 text-center">
      <ShieldX className="mx-auto h-8 w-8 text-destructive" />
      <h1 className="mt-3 font-display text-lg font-semibold">You don't have access</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your role ({role ?? "none"}) can't open {what}. Ask an RMS Administrator if you need it.</p>
    </div>
  );
}
