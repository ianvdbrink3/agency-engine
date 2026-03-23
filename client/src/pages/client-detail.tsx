import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Building2,
  Globe,
  Mail,
  User,
  FolderOpen,
  ArrowRight,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Project } from "@shared/schema";

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

export default function ClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/clients", clientId, "projects"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Klant verwijderd", description: `${client?.name ?? "Klant"} is verwijderd.` });
      navigate("/clients");
    },
    onError: (err: Error) => {
      toast({ title: "Fout bij verwijderen", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = clientLoading || projectsLoading;

  if (clientLoading) {
    return (
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Klant niet gevonden.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/clients">Terug naar klanten</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" data-testid="page-client-detail">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-muted-foreground"
          data-testid="button-back-clients"
        >
          <Link href="/clients">
            <ArrowLeft className="w-4 h-4" />
            Klanten
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-client-name">{client.name}</h1>
            {client.industry && (
              <p className="text-sm text-muted-foreground">{client.industry}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Trash2 className="w-4 h-4" />
                Verwijderen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Klant verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Weet je zeker dat je <strong>{client.name}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Verwijderen..." : "Verwijderen"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            asChild
            className="gap-1.5"
            data-testid="button-new-project"
          >
            <Link href={`/clients/${clientId}/projects/new`}>
              <Plus className="w-4 h-4" />
              Nieuw project
            </Link>
          </Button>
        </div>
      </div>

      {/* Client info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm">Contactgegevens</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2.5">
            {client.domain && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`https://${client.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                  data-testid="link-client-domain"
                >
                  {client.domain}
                </a>
              </div>
            )}
            {client.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span data-testid="text-contact-name">{client.contactName}</span>
              </div>
            )}
            {client.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`mailto:${client.contactEmail}`}
                  className="text-primary hover:underline"
                  data-testid="link-client-email"
                >
                  {client.contactEmail}
                </a>
              </div>
            )}
            {!client.domain && !client.contactName && !client.contactEmail && (
              <p className="text-xs text-muted-foreground">Geen contactgegevens</p>
            )}
          </CardContent>
        </Card>

        {client.notes && (
          <Card className="border border-border/60">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Notities
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {client.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Projects */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-primary" />
              Projecten{" "}
              {projects && (
                <span className="text-muted-foreground font-normal">
                  ({projects.length})
                </span>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="gap-1.5 h-7 text-xs"
              data-testid="button-new-project-table"
            >
              <Link href={`/clients/${clientId}/projects/new`}>
                <Plus className="w-3 h-3" />
                Nieuw project
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {projectsLoading ? (
            <div className="px-5 pb-5 space-y-2 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="px-5 pb-8 pt-4 text-center">
              <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nog geen projecten voor deze klant</p>
              <Button
                size="sm"
                asChild
                className="mt-3 gap-1.5"
                data-testid="button-create-first-project"
              >
                <Link href={`/clients/${clientId}/projects/new`}>
                  <Plus className="w-3.5 h-3.5" />
                  Project starten
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold px-5">Projectnaam</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Aangemaakt</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="hover:bg-muted/20"
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
