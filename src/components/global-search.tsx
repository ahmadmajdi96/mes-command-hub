import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, FlaskConical, Boxes, Beaker, KeyRound, GitBranch, Users as UsersIcon, ShieldCheck } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { useRms } from "@/lib/rms-store";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { recipes, materials, trials, apiKeys, users } = useRms();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string, params?: Record<string, string>) => {
    setOpen(false);
    // @ts-expect-error dynamic navigate
    navigate(params ? { to, params } : { to });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative hidden h-9 w-72 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 text-left text-sm text-muted-foreground/70 hover:text-foreground md:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">Search everywhere…</span>
        <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground md:hidden"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search recipes, materials, trials, users, keys…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick nav">
            <CommandItem value="dashboard control center" onSelect={() => go("/")}>
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Control Center
            </CommandItem>
            <CommandItem value="branches variants" onSelect={() => go("/branches")}>
              <GitBranch className="h-3.5 w-3.5 text-info" /> Variant Branches
            </CommandItem>
            <CommandItem value="compare deviation" onSelect={() => go("/compare")}>
              <GitBranch className="h-3.5 w-3.5 text-warning" /> Comparison Engine
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Recipes">
            {recipes.slice(0, 40).map((r) => (
              <CommandItem key={r.id} value={`${r.code} ${r.name} ${r.project} ${r.version}`}
                onSelect={() => go("/recipes/$id", { id: r.id })}>
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-xs">{r.code}</span>
                <span className="text-xs">{r.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{r.project} · {r.version}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Materials">
            {materials.slice(0, 40).map((m) => (
              <CommandItem key={m.id} value={`${m.id} ${m.name} ${m.category} ${m.supplier ?? ""}`}
                onSelect={() => go("/materials")}>
                <Boxes className="h-3.5 w-3.5 text-accent" />
                <span className="font-mono text-xs">{m.id}</span>
                <span className="text-xs">{m.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{m.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Trials">
            {trials.slice(0, 30).map((t) => (
              <CommandItem key={t.id} value={`${t.id} ${t.recipeId} ${t.outcome}`}
                onSelect={() => go("/trials")}>
                <Beaker className="h-3.5 w-3.5 text-info" />
                <span className="font-mono text-xs">{t.id}</span>
                <span className="text-xs text-muted-foreground">· {t.recipeId} · {t.outcome}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Users">
            {users.map((u) => (
              <CommandItem key={u.id} value={`${u.name} ${u.email} ${u.role}`}
                onSelect={() => go("/users")}>
                <UsersIcon className="h-3.5 w-3.5 text-success" />
                <span className="text-xs">{u.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{u.role}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="API Keys">
            {apiKeys.map((k) => (
              <CommandItem key={k.id} value={`${k.id} ${k.label} ${k.scopes.join(" ")}`}
                onSelect={() => go("/api-keys")}>
                <KeyRound className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs">{k.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{k.active ? "active" : "revoked"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
