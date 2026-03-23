import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, FolderOpen, CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Client, Project } from "@shared/schema";

interface ProjectWithClient extends Project {
  clientName?: string;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function Dashboard() {
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const isLoading = clientsLoading || projectsLoading;

  // Compute stats
  const totalClients = clients?.length ?? 0;
  const totalProjects = projects?.length ?? 0;
  const activeProjects =
    projects?.filter((p) => p.status === "intake" || p.status === "processing").length ?? 0;
  const completedProjects = projects?.filter((p) => p.status === "completed").length ?? 0;

  // Build project + client name list
  const clientMap = new Map(clients?.map((c) => [c.id, c.name]) ?? []);
  const recentProjects: ProjectWithClient[] = (projects ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((p) => ({ ...p, clientName: clientMap.get(p.clientId) }));

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overzicht van al je klanten en projecten
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5" data-testid="button-new-client">
          <Link href="/clients">
            <Plus className="w-4 h-4" />
            Nieuwe klant
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Klanten"
            value={totalClients}
            icon={Users}
            data-testid="stat-total-clients"
          />
          <StatCard
            label="Projecten totaal"
            value={totalProjects}
            icon={FolderOpen}
            data-testid="stat-total-projects"
          />
          <StatCard
            label="Actief"
            value={activeProjects}
            icon={Clock}
            data-testid="stat-active-projects"
          />
          <StatCard
            label="Voltooid"
            value={completedProjects}
            icon={CheckCircle2}
            data-testid="stat-completed-projects"
          />
        </div>
      )}

      {/* Recent projects */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recente projecten</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-xs gap-1 text-muted-foreground"
              data-testid="button-view-all-projects"
            >
              <Link href="/clients">
                Alle klanten
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-5 pb-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="px-5 pb-8 pt-4 text-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nog geen projecten</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Voeg een klant toe en start een project
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold px-5">Project</TableHead>
                  <TableHead className="text-xs font-semibold">Klant</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Aangemaakt</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="hover:bg-muted/20 cursor-pointer"
                    data-testid={`row-project-${project.id}`}
                  >
                    <TableCell className="px-5 font-medium text-sm">
                      <Link
                        href={`/projects/${project.id}`}
                        className="hover:text-primary transition-colors"
                        data-testid={`link-project-${project.id}`}
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {project.clientName ? (
                        <Link
                          href={`/clients/${project.clientId}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {project.clientName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status as any} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(project.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 w-7 p-0"
                        data-testid={`button-open-project-${project.id}`}
                      >
                        <Link href={`/projects/${project.id}`}>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
