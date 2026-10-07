<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Permissions: UI gates via useRms().can (role table in src/lib/rms-data.ts); the database enforces the same rules (RLS, can_write_record, transition_recipe) — server is the source of truth.
- Recipes live in table `recipes`; other entities in `rms_records` (kind + jsonb). Audit is written only by DB triggers/security-definer functions.
- Whole app is gated by the in-root Gate (session + at least one role); first account to sign up becomes RMS Administrator via ensure_profile().
