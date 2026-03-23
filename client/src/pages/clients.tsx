import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Building2,
  Globe,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

const newClientSchema = z.object({
  name: z.string().min(2, "Naam is verplicht"),
  domain: z.string().optional(),
  industry: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type NewClientForm = z.infer<typeof newClientSchema>;

function ClientCard({ client }: { client: Client & { projectCount?: number } }) {
  return (
    <Card
      className="border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all group"
      data-testid={`card-client-${client.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-open-client-${client.id}`}
          >
            <Link href={`/clients/${client.id}`}>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <Link href={`/clients/${client.id}`} data-testid={`link-client-${client.id}`}>
          <h3 className="font-semibold text-sm hover:text-primary transition-colors truncate">
            {client.name}
          </h3>
        </Link>

        {client.industry && (
          <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
        )}

        <div className="mt-3 space-y-1.5">
          {client.domain && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{client.domain}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderOpen className="w-3 h-3 shrink-0" />
            <span className="tabular-nums">
              {client.projectCount ?? 0} project{client.projectCount !== 1 ? "en" : ""}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Attach project counts
  const projectCounts = new Map<number, number>();
  projects?.forEach((p) => {
    projectCounts.set(p.clientId, (projectCounts.get(p.clientId) ?? 0) + 1);
  });

  const filtered = (clients ?? []).filter((c) =>
    search.trim()
      ? c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry?.toLowerCase().includes(search.toLowerCase()) ||
        c.domain?.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const form = useForm<NewClientForm>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {},
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewClientForm) => {
      const res = await apiRequest("POST", "/api/clients", {
        ...data,
        createdAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Klant aangemaakt", description: "De klant is succesvol toegevoegd." });
    },
    onError: (err: Error) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" data-testid="page-clients">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Klanten</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(clients?.length ?? 0)} klanten totaal
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setDialogOpen(true)}
          data-testid="button-add-client"
        >
          <Plus className="w-4 h-4" />
          Klant toevoegen
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Zoek klanten..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
          data-testid="input-search-clients"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "Geen klanten gevonden voor deze zoekopdracht" : "Nog geen klanten"}
          </p>
          {!search && (
            <Button
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => setDialogOpen(true)}
              data-testid="button-add-first-client"
            >
              <Plus className="w-4 h-4" />
              Eerste klant toevoegen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={{ ...client, projectCount: projectCounts.get(client.id) ?? 0 }}
            />
          ))}
        </div>
      )}

      {/* Add client dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-add-client">
          <DialogHeader>
            <DialogTitle>Nieuwe klant toevoegen</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrijfsnaam *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme BV" {...field} data-testid="dialog-input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="acme.nl" {...field} data-testid="dialog-input-domain" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sector</FormLabel>
                      <FormControl>
                        <Input placeholder="E-commerce" {...field} data-testid="dialog-input-industry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contactpersoon</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan de Vries" {...field} data-testid="dialog-input-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mailadres</FormLabel>
                      <FormControl>
                        <Input placeholder="jan@acme.nl" {...field} data-testid="dialog-input-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notities</FormLabel>
                    <FormControl>
                      <Input placeholder="Extra informatie..." {...field} data-testid="dialog-input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-add-client"
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-add-client"
                >
                  {createMutation.isPending ? "Opslaan..." : "Klant toevoegen"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
