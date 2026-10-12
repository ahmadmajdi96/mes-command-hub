import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles,
  LayoutDashboard, FlaskConical, Boxes, GitCompareArrows, GitBranch,
  ClipboardList, Beaker, Workflow, KeyRound, History, Database, Ruler,
  ShieldCheck, Users, Settings, Archive, Factory, Route as RouteIcon, Plug, ArrowLeftRight, ListChecks, BookOpen,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";

const overview = [
  { title: "R&D Control Center", url: "/", icon: LayoutDashboard },
  { title: "Recipes", url: "/recipes", icon: FlaskConical },
  { title: "Review Queue", url: "/review-queue", icon: ClipboardList },
  { title: "QA Insights", url: "/qa-insights", icon: Sparkles },
  { title: "Variant Branches", url: "/branches", icon: GitBranch },
  { title: "Comparison Engine", url: "/compare", icon: GitCompareArrows },
];

const lab = [
  { title: "Trial Logs", url: "/trials", icon: Beaker },
  { title: "Approval Workflow", url: "/workflows", icon: Workflow },
];

const production = [
  { title: "Production Execution", url: "/execution", icon: Factory },
  { title: "Traceability", url: "/traceability", icon: RouteIcon },
  { title: "Integrations (MES · QMS)", url: "/integrations", icon: Plug },
  { title: "Import & Export", url: "/data-exchange", icon: ArrowLeftRight },
];

const master = [
  { title: "Material Catalog", url: "/materials", icon: Boxes },
  { title: "Attribute Schemas", url: "/schemas", icon: Database },
  { title: "Units & Conversions", url: "/units", icon: Ruler },
  { title: "Validation Rules", url: "/validation", icon: ListChecks },
];

const security = [
  { title: "API Keys", url: "/api-keys", icon: KeyRound },
  { title: "Audit Trail", url: "/audit", icon: History },
  { title: "Retention Policy", url: "/retention", icon: Archive },
  { title: "Users & Roles", url: "/users", icon: Users },
  { title: "Role Matrix", url: "/roles", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Technical Documentation", url: "/documentation", icon: BookOpen },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  const renderGroup = (label: string, items: typeof overview) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:border data-[active=true]:border-primary/30 rounded-lg h-10"
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-info text-primary-foreground shadow-[var(--shadow-glow)]">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">Cortanex RMS</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">R&amp;D Recipes · v1.0</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {renderGroup("Formulation", overview)}
        {renderGroup("Laboratory", lab)}
        {renderGroup("Production", production)}
        {renderGroup("Master Data", master)}
        {renderGroup("Governance", security)}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-xs">
            <span className="status-dot animate-pulse-glow text-success" />
            <span className="font-medium">Connected</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Data saved to cloud backend</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
