import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRms } from "@/lib/rms-store";
import { roleDescriptions } from "@/lib/rms-data";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "My profile · Cortanex RMS" },
    { name: "description", content: "Your name, roles and password." },
    { property: "og:title", content: "My profile · Cortanex RMS" },
    { property: "og:description", content: "Your name, roles and password." },
  ] }),
  component: Profile,
});

function Profile() {
  const { actor, roles, userId, updateUser, session, audit } = useRms();
  const [name, setName] = useState(actor);
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => setName(actor), [actor]);
  const mine = audit.filter((a) => a.user === actor).slice(0, 10);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Use at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    if (error) return toast.error(error.message);
    toast.success("Password changed"); setPw(""); setCurrent("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="font-display text-2xl font-semibold">My profile</h1>
        <p className="text-sm text-muted-foreground">{session?.user.email}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={(e) => { e.preventDefault(); if (userId && name.trim()) updateUser(userId, { name: name.trim() }).then(() => toast.success("Name saved — sign in again to refresh it everywhere")); }} className="glass-panel space-y-3 rounded-2xl p-5">
          <h3 className="text-sm font-semibold">Display name (used on signatures)</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:outline-none" />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Save</button>
        </form>
        <form onSubmit={changePw} className="glass-panel space-y-3 rounded-2xl p-5">
          <h3 className="text-sm font-semibold">Change password</h3>
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" className="h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:outline-none" />
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" className="h-9 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:outline-none" />
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Update password</button>
        </form>
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold">My roles</h3>
        <ul className="mt-2 space-y-2">{roles.map((r) => <li key={r} className="text-xs"><span className="font-medium text-primary">{r}</span> — <span className="text-muted-foreground">{roleDescriptions[r]}</span></li>)}</ul>
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-semibold">My recent activity</h3>
        {mine.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Nothing yet.</p> : (
          <ul className="mt-2 space-y-1 text-xs">{mine.map((a) => <li key={a.id}><span className="font-mono text-muted-foreground">{a.ts}</span> · {a.action} {a.entity}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
