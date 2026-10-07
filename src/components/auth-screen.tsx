import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("signin");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res && "error" in res && res.error) toast.error(String((res.error as Error).message ?? res.error));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-panel w-full max-w-sm rounded-2xl p-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground"><FlaskConical className="h-5 w-5" /></div>
          <div>
            <div className="font-display text-lg font-semibold">Cortanex RMS</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recipe Management System</div>
          </div>
        </div>
        <h1 className="mt-6 text-sm font-semibold">{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}</h1>
        <form onSubmit={submit} className="mt-3 space-y-3">
          {mode === "signup" && (
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-10 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:border-primary/50 focus:outline-none" />
          )}
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-10 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:border-primary/50 focus:outline-none" />
          {mode !== "reset" && (
            <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-10 w-full rounded-lg border border-border/60 bg-card/60 px-3 text-sm focus:border-primary/50 focus:outline-none" />
          )}
          <button disabled={busy} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>
        {mode !== "reset" && (
          <button onClick={google} className="mt-3 h-10 w-full rounded-lg border border-border/60 bg-card/60 text-sm hover:border-primary/40">Continue with Google</button>
        )}
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button onClick={() => setMode("signup")} className="hover:text-primary">Create account</button>
              <button onClick={() => setMode("reset")} className="hover:text-primary">Forgot password?</button>
            </>
          ) : <button onClick={() => setMode("signin")} className="hover:text-primary">Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}
