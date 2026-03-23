import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  ChevronRight,
  Sun,
  Moon,
  Building2,
  Settings,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Klanten", icon: Users },
  { href: "/settings", label: "Instellingen", icon: Settings },
];

function ThijoLogo() {
  return (
    <img
      src="/logo-clickwave.png"
      alt="Clickwave"
      width="120"
      height="28"
      className="flex-shrink-0 brightness-0 dark:brightness-100 dark:invert-0 invert"
      style={{ objectFit: "contain" }}
    />
  );
}

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Klant verwijderd" });
      if (location === `/clients/${id}`) navigate("/clients");
    },
  });

  const recentClients = clients?.slice(0, 5) ?? [];

  return (
    <Sidebar
      className="border-r border-sidebar-border"
      data-testid="app-sidebar"
    >
      {/* Header */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <Link href="/" className="flex flex-col items-start gap-2 group" data-testid="link-logo-home">
          <img
            src="/logo-clickwave.png"
            alt="Clickwave"
            width="140"
            height="32"
            className="flex-shrink-0 brightness-0 dark:brightness-100 dark:invert-0 invert"
            style={{ objectFit: "contain" }}
          />
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-sidebar-foreground/40">
            THIJO
          </span>
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
                  <SidebarMenuItem key={client.id} className="group/item">
                    <div className="flex items-center w-full">
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="gap-2 flex-1"
                        data-testid={`nav-client-${client.id}`}
                      >
                        <Link href={`/clients/${client.id}`}>
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-sm">{client.name}</span>
                          <ChevronRight className="w-3 h-3 ml-auto opacity-40 group-hover/item:hidden" />
                        </Link>
                      </SidebarMenuButton>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="hidden group-hover/item:flex items-center justify-center w-6 h-6 rounded text-sidebar-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 mr-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Klant verwijderen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet je zeker dat je <strong>{client.name}</strong> wilt verwijderen?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(client.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Verwijderen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
          <span className="text-[10px] text-sidebar-foreground/30">
            THIJO Marketing Tool
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
