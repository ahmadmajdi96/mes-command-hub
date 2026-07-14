import { createFileRoute } from "@tanstack/react-router";
import { Plus, UserPlus } from "lucide-react";
import { useRms } from "@/lib/rms-store";
import { StatusPill } from "@/components/status-pill";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users · Cortanex RMS" }, { name: "description", content: "User accounts and role assignments." }] }),
  component: Users,
});

function Users() {
  const { users } = useRms();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage accounts and role assignments across the platform.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <UserPlus className="h-3.5 w-3.5" /> Invite user
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">Name</th>
              <th className="py-3 pr-3 font-medium">Email</th>
              <th className="py-3 pr-3 font-medium">Role</th>
              <th className="py-3 pr-3 font-medium">Status</th>
              <th className="py-3 pr-4 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/40 hover:bg-muted/20">
                <td className="py-3 pl-4 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-info text-[10px] font-bold text-primary-foreground">
                      {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{u.email}</td>
                <td className="py-3 pr-3"><span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{u.role}</span></td>
                <td className="py-3 pr-3"><StatusPill status={u.status} /></td>
                <td className="py-3 pr-4 font-mono text-[11px] text-muted-foreground">{u.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
