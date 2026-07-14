import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Plus, Copy, Ban, ShieldCheck } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/api-keys")({
  head: () => ({ meta: [{ title: "API Keys · Cortanex RMS" }, { name: "description", content: "Self-service token provisioning with granular scopes and instant revocation." }] }),
  component: ApiKeys,
});

const ALL_SCOPES = ["recipes:read", "recipes:write", "materials:read", "materials:write"];

function ApiKeys() {
  const { apiKeys, revokeKey } = useRms();
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState<"30" | "90" | "infinite">("90");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["recipes:read"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground">Cryptographically secure tokens for downstream ERP / MES / LIMS consumers.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-4 pr-3 font-medium">Label</th>
                <th className="py-3 pr-3 font-medium">Token</th>
                <th className="py-3 pr-3 font-medium">Scopes</th>
                <th className="py-3 pr-3 font-medium">Expires</th>
                <th className="py-3 pr-3 font-medium text-right">Calls today</th>
                <th className="py-3 pr-3 font-medium">Status</th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k) => (
                <tr key={k.id} className="border-t border-border/40">
                  <td className="py-3 pl-4 pr-3">
                    <div className="font-medium">{k.label}</div>
                    <div className="text-[10px] text-muted-foreground">created {k.createdAt} · by {k.createdBy}</div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-muted/40 px-2 py-0.5 font-mono text-[11px] text-primary">{k.tokenPreview}</span>
                      <button className="text-muted-foreground hover:text-foreground" title="Copy"><Copy className="h-3 w-3" /></button>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-[11px] text-muted-foreground">{k.expiresAt ?? "∞"}</td>
                  <td className="py-3 pr-3 text-right font-mono">{k.callsToday}</td>
                  <td className="py-3 pr-3"><StatusPill status={k.active ? "active" : "revoked"} /></td>
                  <td className="py-3 pr-4">
                    {k.active && (
                      <button onClick={() => revokeKey(k.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20">
                        <Ban className="h-3 w-3" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel h-fit rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Provision new token</h3>
          </div>
          <div className="mt-3 space-y-3">
            <label className="block text-xs">Label
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Batch reactor 4 daily sync" className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm" />
            </label>
            <label className="block text-xs">Expiration
              <select value={expiry} onChange={(e) => setExpiry(e.target.value as any)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="infinite">Never expires</option>
              </select>
            </label>
            <div>
              <div className="text-xs">Scopes</div>
              <div className="mt-2 space-y-1.5">
                {ALL_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="accent-primary" checked={selectedScopes.includes(s)} onChange={(e) => setSelectedScopes(e.target.checked ? [...selectedScopes, s] : selectedScopes.filter((x) => x !== s))} />
                    <span className="font-mono text-primary">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground">
              <Plus className="h-4 w-4" /> Generate token
            </button>
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-2.5 text-[11px] text-warning">
              <div className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-3 w-3" /> Least privilege</div>
              <p className="mt-0.5 text-warning/80">Tokens are shown once — copy and store securely.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
