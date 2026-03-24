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
  LogOut,
  User,
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
import { useAuth } from "@/lib/auth";
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
  const { user, logout } = useAuth();

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
  const myClients = recentClients.filter((c) => c.userId === user?.id && !c.shared);
  const sharedClients = recentClients.filter((c) => c.shared);

  function ClientItem({ client }: { client: Client }) {
    const isActive = location === `/clients/${client.id}`;
    return (
      <SidebarMenuItem>
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
            </Link>
          </SidebarMenuButton>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex items-center justify-center w-6 h-6 rounded text-sidebar-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 mr-1">
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
  }

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

        {/* Mijn klanten */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-1">
            <User className="w-3 h-3 inline mr-1.5" />
            Mijn klanten
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientsLoading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Skeleton className="w-5 h-5 rounded bg-sidebar-accent" />
                      <Skeleton className="h-3 w-24 bg-sidebar-accent" />
                    </div>
                  </SidebarMenuItem>
                ))}
              {!clientsLoading && myClients.length === 0 && (
                <SidebarMenuItem>
                  <p className="text-xs text-sidebar-foreground/40 px-2 py-1.5">
                    Nog geen eigen klanten
                  </p>
                </SidebarMenuItem>
              )}
              {myClients.map((client) => (
                <ClientItem key={client.id} client={client} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Gedeeld met team */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 px-2 mb-1">
            <Users className="w-3 h-3 inline mr-1.5" />
            Gedeeld met team
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientsLoading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <SidebarMenuItem key={`shared-${i}`}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Skeleton className="w-5 h-5 rounded bg-sidebar-accent" />
                      <Skeleton className="h-3 w-24 bg-sidebar-accent" />
                    </div>
                  </SidebarMenuItem>
                ))}
              {!clientsLoading && sharedClients.length === 0 && (
                <SidebarMenuItem>
                  <p className="text-xs text-sidebar-foreground/40 px-2 py-1.5">
                    Geen gedeelde klanten
                  </p>
                </SidebarMenuItem>
              )}
              {sharedClients.map((client) => (
                <ClientItem key={client.id} client={client} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!clientsLoading && (myClients.length > 0 || sharedClients.length > 0) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-sidebar-border space-y-2">
        {user && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-sidebar-foreground/70 truncate max-w-[100px]">
                {user.displayName || user.username}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); navigate("/"); }}
              className="h-7 w-7 p-0 text-sidebar-foreground/40 hover:text-sidebar-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
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
      </SidebarFooter>
    </Sidebar>
  );
}
