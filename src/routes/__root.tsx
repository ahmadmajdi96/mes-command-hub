import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter,
  HeadContent, Scripts, type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Bell, ChevronRight, LogOut, Loader2, ShieldAlert } from "lucide-react";
import { AuthScreen } from "@/components/auth-screen";
import { GlobalSearch } from "@/components/global-search";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RmsStoreProvider, useRms } from "@/lib/rms-store";
import { Toaster } from "@/components/ui/sonner";
import { ROLES, type Role } from "@/lib/rms-data";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This route doesn't exist in the R&amp;D sandbox.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Back to Control Center
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cortanex RMS — R&D Recipe Management" },
      { name: "description", content: "Industry-agnostic R&D recipe management: sandbox formulator, comparison engine, trial logging, stage-gate workflows and API key governance." },
      { property: "og:title", content: "Cortanex RMS — R&D Recipe Management" },
      { property: "og:description", content: "Single source of truth for raw material profiling, sandbox formulation and iterative research logging." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const roleInitials: Record<Role, string> = {
  "Recipe Engineer": "RE",
  "QA / Quality Manager": "QA",
  "Production Manager": "PM",
  "Operator": "OP",
  "RMS Administrator": "AD",
};

function TopBar() {
  const { role, roles, setRole, actor, signOut, audit } = useRms();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <span>Cortanex</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Recipe Management</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        {roles.length > 1 && (
          <select value={role ?? ""} onChange={(e) => setRole(e.target.value as Role)} aria-label="Active role"
            className="h-9 rounded-lg border border-border/60 bg-card/60 px-2 text-xs text-foreground focus:border-primary/50 focus:outline-none">
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
        )}
        <Link to="/audit" className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground transition hover:text-foreground" title="Recent activity">
          <Bell className="h-4 w-4" />
          {audit.length > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
        </Link>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2 py-1">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary to-info text-[10px] font-bold text-primary-foreground">
            {role ? roleInitials[role] : "—"}
          </div>
          <div className="hidden text-xs leading-tight sm:block">
            <div className="font-medium">{actor}</div>
            <div className="text-[10px] text-muted-foreground">{role ?? "No role assigned"}</div>
          </div>
        </div>
        <button onClick={signOut} title="Sign out" className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/60 text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { session, ready, roles } = useRms();
  if (!ready) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!session) return <AuthScreen />;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6">
            {roles.length === 0 ? (
              <div className="glass-panel mx-auto mt-10 max-w-md rounded-2xl p-6 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
                <h1 className="mt-3 font-display text-lg font-semibold">Waiting for access</h1>
                <p className="mt-1 text-sm text-muted-foreground">Your account is active, but an RMS Administrator still needs to assign you a role.</p>
              </div>
            ) : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RmsStoreProvider>
        <Gate><Outlet /></Gate>
        <Toaster theme="dark" position="bottom-right" richColors />
      </RmsStoreProvider>
    </QueryClientProvider>
  );
}
