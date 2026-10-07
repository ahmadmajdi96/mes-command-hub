import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KeyRound, Plus, Copy, Ban, ShieldCheck, Trash2 } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { EntityFormDialog, ConfirmDialog, type FieldSpec } from "@/components/entity-form-dialog";

export const Route = createFileRoute("/api-keys")({
  head: () => ({ meta: [{ title: "API Keys · Cortanex RMS" }, { name: "description", content: "Self-service token provisioning with granular scopes and instant revocation." }] }),
  component: ApiKeys,
});

const ALL_SCOPES = ["recipes:read", "recipes:write", "materials:read", "materials:write", "trials:read", "trials:write"];

function ApiKeys() {
  const { apiKeys, revokeKey, deleteApiKey, addApiKey } = useRms();
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields = useMemo<FieldSpec[]>(() => [
    { key: "label", label: "Label", type: "text", required: true, placeholder: "e.g. Batch reactor 4 daily sync", col: 2 },
    { key: "createdBy", label: "Owner", type: "text", required: true, placeholder: "R. Admin" },
    { key: "expiresAt", label: "Expires (YYYY-MM-DD)", type: "text", placeholder: "leave blank for ∞" },
    { key: "scopes", label: "Scopes", type: "multiselect", options: ALL_SCOPES.map((s) => ({ value: s, label: s })), help: "Least-privilege principle — grant only what the caller needs" },
  ], []);

  const submit = (v: any) => {
    addApiKey({ label: v.label, createdBy: v.createdBy, expiresAt: v.expiresAt || null, scopes: v.scopes ?? [] });
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground">Cryptographically secure tokens for downstream ERP / MES / LIMS consumers.</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Provision token
        </button>
      </div>

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
                  <div className="flex items-center justify-end gap-1">
                    {k.active && (
                      <button onClick={() => revokeKey(k.id)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20">
                        <Ban className="h-3 w-3" /> Revoke
                      </button>
                    )}
                    <button onClick={() => setDeleteId(k.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel flex items-start gap-3 rounded-2xl p-4 text-xs text-muted-foreground">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="h-4 w-4" /></div>
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><ShieldCheck className="h-3.5 w-3.5 text-warning" /> Least-privilege reminder</div>
          <p className="mt-0.5">Tokens are shown once. Rotate every 90 days for high-traffic integrations and immediately if compromised.</p>
        </div>
      </div>

      <EntityFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Provision new API token"
        subtitle="Scoped tokens can be revoked at any time."
        fields={fields}
        initial={{ createdBy: "R. Admin", scopes: ["recipes:read"], expiresAt: "" }}
        onSubmit={submit}
        submitLabel="Generate token"
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteApiKey(deleteId)}
        title="Delete key permanently?"
        message="Revoke first if you only want to stop it. Deletion removes it from the log listing."
      />
    </div>
  );
}
