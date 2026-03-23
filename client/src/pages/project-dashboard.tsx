import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Zap,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Client, SeoData, SeaData, StrategySummary, Intake } from "@shared/schema";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ProjectDashboard() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", project?.clientId],
    enabled: !!project?.clientId,
  });

  const { data: seoData, isLoading: seoLoading } = useQuery<SeoData | null>({
    queryKey: ["/api/projects", projectId, "seo"],
    enabled: !!projectId,
  });

  const { data: seaData, isLoading: seaLoading } = useQuery<SeaData | null>({
    queryKey: ["/api/projects", projectId, "sea"],
    enabled: !!projectId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<StrategySummary | null>({
    queryKey: ["/api/projects", projectId, "summary"],
    enabled: !!projectId,
  });

  const { data: intake } = useQuery<Intake | null>({
    queryKey: ["/api/projects", projectId, "intake"],
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "seo"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sea"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "summary"] });
      toast({
        title: "Strategie gegenereerd",
        description: "De marketingstrategie is succesvol aangemaakt.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Fout bij genereren",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const isDataLoading = seoLoading || seaLoading || summaryLoading;
  const hasData = !!(seoData || seaData || summary);

  if (projectLoading) {
    return (
      <div className="p-6 space-y-5 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Project niet gevonden.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/">Terug naar dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-project-dashboard">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 h-auto p-0 text-muted-foreground"
          data-testid="button-back-dashboard"
        >
          <Link href="/">Dashboard</Link>
        </Button>
        {client && (
          <>
            <span>/</span>
            <Link
              href={`/clients/${client.id}`}
              className="hover:text-foreground transition-colors"
              data-testid="link-breadcrumb-client"
            >
              {client.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground font-medium truncate">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-project-name">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <StatusBadge status={project.status as any} data-testid="badge-project-status" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span className="tabular-nums">{formatDate(project.createdAt)}</span>
              </div>
              {client && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="w-3 h-3" />
                  <Link
                    href={`/clients/${client.id}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {client.name}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isDataLoading}
          className="gap-2 shrink-0"
          data-testid="button-generate-strategy"
        >
          {generateMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Genereren...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {hasData ? "Opnieuw genereren" : "Strategie genereren"}
            </>
          )}
        </Button>
      </div>

      {/* Intake summary card */}
      {intake && (
        <Card className="border border-border/60 bg-muted/20">
          <CardContent className="px-5 py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {intake.companyName && (
                <span>
                  <span className="font-medium text-foreground">Bedrijf:</span> {intake.companyName}
                </span>
              )}
              {intake.industry && (
                <span>
                  <span className="font-medium text-foreground">Sector:</span> {intake.industry}
                </span>
              )}
              {intake.businessModel && (
                <span>
                  <span className="font-medium text-foreground">Model:</span> {intake.businessModel}
                </span>
              )}
              {intake.country && (
                <span>
                  <span className="font-medium text-foreground">Land:</span> {intake.country}
                </span>
              )}
              {intake.adBudget && (
                <span>
                  <span className="font-medium text-foreground">Budget:</span> {intake.adBudget}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy tabs */}
      {isDataLoading && !hasData ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <DashboardTabs
          seoData={seoData ?? null}
          seaData={seaData ?? null}
          summary={summary ?? null}
          isLoading={isDataLoading}
        />
      )}
    </div>
  );
}
