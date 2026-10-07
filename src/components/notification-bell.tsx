import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useRms } from "@/lib/rms-store";

export function NotificationBell() {
  const { notifications, markNotificationsRead } = useRms();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground transition hover:text-foreground">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border/60 bg-popover p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold">Notifications</span>
            {unread > 0 && <button onClick={() => markNotificationsRead()} className="inline-flex items-center gap-1 text-[11px] text-primary"><CheckCheck className="h-3 w-3" /> Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">You're all caught up.</p>}
            {notifications.map((n) => (
              <Link key={n.id} to={n.link ?? "/"} onClick={() => { setOpen(false); if (!n.read) markNotificationsRead([n.id]); }}
                className={`block rounded-lg px-2 py-2 text-xs hover:bg-muted/30 ${n.read ? "opacity-60" : ""}`}>
                <div className="flex justify-between gap-2"><span className="font-medium">{n.title}</span><span className="shrink-0 font-mono text-[10px] text-muted-foreground">{n.created_at.slice(5, 16).replace("T", " ")}</span></div>
                <div className="text-muted-foreground">{n.body}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
