import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  ChevronRight,
  Sun,
  Moon,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import type { Client } from "@shared/schema";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Klanten", icon: Users },
];

function AgencyEngineLogo() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="28"
      height="28"
      fill="none"
      aria-label="Agency Engine"
      className="flex-shrink-0"
    >
      {/* Gear outer ring */}
      <circle cx="16" cy="16" r="13" stroke="hsl(199 89% 48%)" strokeWidth="2" />
      {/* Gear teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <rect
          key={i}
          x="14.5"
          y="1"
          width="3"
          height="5"
          rx="1"
          fill="hsl(199 89% 48%)"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      {/* Inner circle */}
      <circle cx="16" cy="16" r="5" fill="hsl(199 89% 48%)" />
      {/* Center dot */}
      <circle cx="16" cy="16" r="2" fill="hsl(222 47% 11%)" />
    </svg>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const recentClients = clients?.slice(0, 5) ?? [];

  return (
    <Sidebar
      className="border-r border-sidebar-border"
      data-testid="app-sidebar"
    >
      {/* Header */}
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 group" data-testid="link-logo-home">
          <AgencyEngineLogo />
          <div>
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight leading-none block">
              Agency Engine
            </span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-none mt-0.5 block">
              Marketing Platform
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? location === "/" : location.startsWith(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="gap-2.5"
                      data-testid={`nav-${label.toLowerCase()}`}
                    >
                      <Link href={href}>
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Recent clients */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-1">
            Recente klanten
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientsLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Skeleton className="w-5 h-5 rounded bg-sidebar-accent" />
                      <Skeleton className="h-3 w-24 bg-sidebar-accent" />
                    </div>
                  </SidebarMenuItem>
                ))}
              {!clientsLoading && recentClients.length === 0 && (
                <SidebarMenuItem>
                  <p className="text-xs text-sidebar-foreground/40 px-2 py-1.5">
                    Nog geen klanten
                  </p>
                </SidebarMenuItem>
              )}
              {recentClients.map((client) => {
                const isActive = location === `/clients/${client.id}`;
                return (
                  <SidebarMenuItem key={client.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="gap-2"
                      data-testid={`nav-client-${client.id}`}
                    >
                      <Link href={`/clients/${client.id}`}>
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-sm">{client.name}</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {!clientsLoading && recentClients.length > 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="text-xs text-sidebar-foreground/50"
                    data-testid="nav-all-clients"
                  >
                    <Link href="/clients">
                      <span className="ml-5">Alle klanten bekijken</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs"
          data-testid="button-toggle-theme"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-3.5 h-3.5" />
              Lichte modus
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5" />
              Donkere modus
            </>
          )}
        </Button>
        <div className="mt-2 px-1">
          <a
            href="https://www.perplexity.ai/computer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-sidebar-foreground/30 hover:text-sidebar-foreground/50 transition-colors"
          >
            Gemaakt met Perplexity Computer
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
