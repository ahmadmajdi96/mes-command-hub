import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Plus, Copy, Ban, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { ConfirmDialog } from "@/components/entity-form-dialog";
import { AccessDenied } from "@/components/access-denied";

export const Route = createFileRoute("/api-keys")({
  head: () => ({ meta: [
    { title: "API Keys · Cortanex RMS" },
    { name: "description", content: "Issue, scope, expire and revoke API keys for MES, QMS and ERP connections." },
    { property: "og:title", content: "API Keys · Cortanex RMS" },
    { property: "og:description", content: "Hashed, scoped and expiring API keys for system integrations." },
  ] }),
  component: ApiKeys,
});

const ALL_SCOPES = ["recipes:read", "executions:write", "quality:write"];

function ApiKeys() {
  const { apiKeys, revokeKey, deleteApiKey, createApiKey, can } = useRms();
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["recipes:read"]);
  const [expires, setExpires] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  if (!can("integration.manage")) return <AccessDenied what="API keys" />;

  const create = async () => {
    if (!label.trim() || scopes.length === 0) return toast.error("Label and at least one scope are required");
    const t = await createApiKey(label.trim(), scopes, expires ? new Date(expires).toISOString() : null);
    if (t) { setToken(t); setCreating(false); setLabel(""); setExpires(""); }
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-end justify-between gap-3 rounded-2xl p-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Integration security</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keys are shown once, stored only as a hash, scoped and optionally expiring. Send as header <code className="font-mono text-primary">x-api-key</code>.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"><Plus className="h-3.5 w-3.5" /> New key</button>
      </div>

      {token && (
        <div className="rounded-2xl border border-success/40 bg-success/5 p-4">
          <div className="text-sm font-semibold text-success">Copy this key now — it will not be shown again</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-background/60 p-2 font-mono text-xs">{token}</code>
            <button onClick={() => { navigator.clipboard.writeText(token); toast.success("Copied"); }} className="rounded-lg border border-border/60 p-2 hover:text-primary"><Copy className="h-4 w-4" /></button>
            <button onClick={() => setToken(null)} className="text-xs text-muted-foreground">Done</button>
          </div>
        </div>
      )}

      {creating && (
        <div className="glass-panel space-y-3 rounded-2xl p-5">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. MES Command Center – Line 2" className="h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:outline-none" />
          <div className="flex flex-wrap gap-2">
            {ALL_SCOPES.map((s) => (
              <label key={s} className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-xs ${scopes.includes(s) ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60"}`}>
                <input type="checkbox" className="hidden" checked={scopes.includes(s)} onChange={(e) => setScopes((p) => e.target.checked ? [...p, s] : p.filter((x) => x !== s))} />{s}
              </label>
            ))}
          </div>
          <label className="block text-xs text-muted-foreground">Expires (optional)
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="ml-2 h-8 rounded-lg border border-border/60 bg-card/60 px-2 text-xs" />
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="px-3 py-1 text-xs text-muted-foreground">Cancel</button>
            <button onClick={create} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Generate key</button>
          </div>
        </div>
      )}

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pl-4 pr-3">Key</th><th className="pr-3">Scopes</th><th className="pr-3">Created</th><th className="pr-3">Expires</th><th className="pr-3">Last used</th><th className="pr-3">Calls</th><th className="pr-3">Status</th><th></th>
          </tr></thead>
          <tbody>
            {apiKeys.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-xs text-muted-foreground">No API keys yet.</td></tr>}
            {apiKeys.map((k) => {
              const expired = k.expires_at && new Date(k.expires_at) < new Date();
              return (
                <tr key={k.id} className="border-t border-border/40">
                  <td className="py-3 pl-4 pr-3"><div className="flex items-center gap-2 font-medium"><KeyRound className="h-3.5 w-3.5 text-primary" />{k.label}</div><div className="font-mono text-[10px] text-muted-foreground">{k.prefix}…</div></td>
                  <td className="pr-3"><div className="flex flex-wrap gap-1">{k.scopes.map((s) => <span key={s} className="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">{s}</span>)}</div></td>
                  <td className="pr-3 text-xs">{k.created_at.slice(0, 10)}<div className="text-muted-foreground">{k.created_by_name}</div></td>
                  <td className="pr-3 text-xs">{k.expires_at ? k.expires_at.slice(0, 10) : "never"}</td>
                  <td className="pr-3 font-mono text-[11px]">{k.last_used_at ? k.last_used_at.slice(0, 16).replace("T", " ") : "—"}</td>
                  <td className="pr-3 font-mono text-xs">{k.call_count}</td>
                  <td className="pr-3"><StatusPill status={!k.active ? "revoked" : expired ? "disabled" : "active"} /></td>
                  <td className="pr-3">
                    <div className="flex gap-1">
                      {k.active && <button onClick={() => revokeKey(k.id)} title="Revoke" className="rounded p-1 text-warning hover:bg-warning/10"><Ban className="h-4 w-4" /></button>}
                      <button onClick={() => setDeleteId(k.id)} title="Delete" className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Every key action is recorded in the audit trail.</p>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteApiKey(deleteId); setDeleteId(null); }} title="Delete API key" message="Systems using this key will immediately lose access." />
    </div>
  );
}
