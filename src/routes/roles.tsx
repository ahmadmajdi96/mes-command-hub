import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { roleMatrix, ROLES, roleDescriptions } from "@/lib/rms-data";

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Role Matrix · Cortanex RMS" }, { name: "description", content: "Workspace functional domain capabilities per role." }, { property: "og:title", content: "Role Matrix · Cortanex RMS" }, { property: "og:description", content: "Workspace functional domain capabilities per role." }] }),
  component: RolesPage,
});

function RolesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Role Matrix</h1>
        <p className="text-sm text-muted-foreground">Least-privilege capability map across the four platform roles.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {ROLES.map((r) => (
          <div key={r} className="glass-panel rounded-xl p-4">
            <div className="text-sm font-semibold text-primary">{r}</div>
            <p className="mt-1 text-xs text-muted-foreground">{roleDescriptions[r]}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning">Segregation of duties: a Recipe Engineer can never approve or release a recipe they authored. Administrators configure the system but do not participate in business approvals.</div>
      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 pl-4 pr-3 font-medium">Capability</th>
              {ROLES.map((r) => (
                <th key={r} className="py-3 pr-3 text-center font-medium">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roleMatrix.map((row) => (
              <tr key={row.capability} className="border-t border-border/40 hover:bg-muted/10">
                <td className="py-3 pl-4 pr-3 font-medium">{row.capability}</td>
                {ROLES.map((r) => (
                  <td key={r} className="py-3 pr-3 text-center">
                    {row.perms[r] ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"><Check className="h-3.5 w-3.5" /></span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/40 text-muted-foreground"><X className="h-3.5 w-3.5" /></span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
