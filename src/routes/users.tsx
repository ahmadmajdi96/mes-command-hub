import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Search } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";
import { ROLES } from "@/lib/rms-data";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [
    { title: "Users & Roles · Cortanex RMS" },
    { name: "description", content: "Activate accounts and assign RMS roles." },
    { property: "og:title", content: "Users & Roles · Cortanex RMS" },
    { property: "og:description", content: "Activate accounts and assign RMS roles." },
  ] }),
  component: Users,
});

function Users() {
  const { users, setUserRole, updateUser, can, userId } = useRms();
  const admin = can("users.manage");
  const [q, setQ] = useState("");
  const list = users.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="glass-panel flex flex-wrap items-end justify-between gap-3 rounded-2xl p-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Access control</div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Users &amp; Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">People join by creating an account; an administrator then assigns one or more roles. Every change is logged in the audit trail.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people…" className="h-9 w-56 rounded-lg border border-border/60 bg-card/60 pl-8 pr-3 text-xs focus:outline-none" />
        </div>
      </div>
      {!admin && <p className="flex items-center gap-1 text-xs text-warning"><Lock className="h-3 w-3" /> Only RMS Administrators can change roles.</p>}

      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">Person</th>
              {ROLES.map((r) => <th key={r} className="py-3 pr-3 text-center font-medium">{r}</th>)}
              <th className="py-3 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={ROLES.length + 2} className="p-6 text-center text-xs text-muted-foreground">No users found.</td></tr>}
            {list.map((u) => (
              <tr key={u.id} className="border-t border-border/40">
                <td className="py-3 pl-4 pr-3"><div className="font-medium">{u.name || "—"}{u.id === userId && <span className="ml-1 text-[10px] text-primary">(you)</span>}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                {ROLES.map((r) => (
                  <td key={r} className="py-3 pr-3 text-center">
                    <input type="checkbox" aria-label={`${r} for ${u.email}`} disabled={!admin || (u.id === userId && r === "RMS Administrator")}
                      checked={u.roles.includes(r)} onChange={(e) => setUserRole(u.id, r, e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                  </td>
                ))}
                <td className="py-3 pr-4">
                  {admin && u.id !== userId ? (
                    <select value={u.status} onChange={(e) => updateUser(u.id, { status: e.target.value })} className="rounded border border-border/60 bg-card/60 px-1.5 py-0.5 text-xs">
                      <option value="active">active</option><option value="disabled">disabled</option>
                    </select>
                  ) : <StatusPill status={u.status} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
