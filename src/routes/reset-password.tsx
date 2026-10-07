import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password · Cortanex RMS" },
    { name: "description", content: "Choose a new password for your Cortanex RMS account." },
    { property: "og:title", content: "Reset password · Cortanex RMS" },
    { property: "og:description", content: "Choose a new password for your Cortanex RMS account." },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/" });
  };
  return (
    <form onSubmit={save} className="glass-panel mx-auto mt-10 max-w-sm space-y-3 rounded-2xl p-6">
      <h1 className="font-display text-lg font-semibold">Set a new password</h1>
      <input required minLength={8} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="h-10 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:outline-none" />
      <button className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Save password</button>
    </form>
  );
}
