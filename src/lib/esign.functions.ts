import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Electronic signature: re-verifies the signer's password on the server and returns a
 * one-action signature token the database checks before approve/reject/release/obsolete.
 */
export const signRecipeAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    recipeId: z.string().min(1).max(64),
    action: z.enum(["approve", "reject", "release", "obsolete"]),
    password: z.string().min(1).max(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email) return { ok: false as const, error: "Your account has no email address" };

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const verifier = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const { data: auth, error } = await verifier.auth.signInWithPassword({ email, password: data.password });
    if (error || auth.user?.id !== context.userId) return { ok: false as const, error: "Password incorrect — signature not applied" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin.from("app_config").select("value").eq("key", "esign_secret").single();
    if (!cfg) return { ok: false as const, error: "Signature service unavailable" };
    const sig = createHmac("sha256", cfg.value).update(`${context.userId}:${data.recipeId}:${data.action}`).digest("hex");
    return { ok: true as const, sig };
  });
