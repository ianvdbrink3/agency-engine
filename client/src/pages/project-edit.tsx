import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, Intake } from "@shared/schema";

const editSchema = z.object({
  companyName: z.string().min(1),
  domain: z.string().optional(),
  industry: z.string().optional(),
  productsServices: z.string().optional(),
  targetAudience: z.string().optional(),
  businessModel: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  competitors: z.string().optional(),
  seoGoals: z.string().optional(),
  seaGoals: z.string().optional(),
  focusServices: z.string().optional(),
  adBudget: z.string().optional(),
  conversionType: z.string().optional(),
  priorities: z.string().optional(),
  extraContext: z.string().optional(),
});

type EditData = z.infer<typeof editSchema>;

function parseJsonField(val: string | null | undefined): string {
  if (!val) return "";
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr.join(", ") : val;
  } catch { return val; }
}

export default function ProjectEdit() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: project, isLoading: projLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const nullOn404 = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const res = await fetch(queryKey.join("/"));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  };

  const { data: intake, isLoading: intakeLoading } = useQuery<Intake | null>({
    queryKey: ["/api/projects", projectId, "intake"],
    queryFn: nullOn404,
    enabled: !!projectId,
  });

  const form = useForm<EditData>({
    resolver: zodResolver(editSchema),
    defaultValues: { companyName: "", domain: "", industry: "", productsServices: "", targetAudience: "", businessModel: "B2B", country: "Nederland", language: "Nederlands", region: "", competitors: "", seoGoals: "", seaGoals: "", focusServices: "", adBudget: "", conversionType: "", priorities: "", extraContext: "" },
  });

  // Pre-fill form when intake loads
  useEffect(() => {
    if (intake) {
      form.reset({
        companyName: intake.companyName ?? "",
        domain: intake.domain ?? "",
        industry: intake.industry ?? "",
        productsServices: parseJsonField(intake.productsServices),
        targetAudience: intake.targetAudience ?? "",
        businessModel: intake.businessModel ?? "B2B",
        country: intake.country ?? "Nederland",
        language: intake.language ?? "Nederlands",
        region: intake.region ?? "",
        competitors: parseJsonField(intake.competitors),
        seoGoals: parseJsonField(intake.seoGoals),
        seaGoals: parseJsonField(intake.seaGoals),
        focusServices: parseJsonField(intake.focusServices),
        adBudget: intake.adBudget ?? "",
        conversionType: intake.conversionType ?? "",
        priorities: parseJsonField(intake.priorities),
        extraContext: intake.extraContext ?? "",
      });
    }
  }, [intake]);

  const saveMutation = useMutation({
    mutationFn: async (data: EditData) => {
      const toJsonArray = (s: string | undefined) => s ? JSON.stringify(s.split(",").map(x => x.trim()).filter(Boolean)) : null;
      await apiRequest("PUT", `/api/projects/${projectId}/intake`, {
        projectId,
        companyName: data.companyName,
        domain: data.domain || null,
        industry: data.industry || null,
        productsServices: toJsonArray(data.productsServices),
        targetAudience: data.targetAudience || null,
        businessModel: data.businessModel || "B2B",
        country: data.country || null,
        language: data.language || null,
        region: data.region || null,
        competitors: toJsonArray(data.competitors),
        seoGoals: toJsonArray(data.seoGoals),
        seaGoals: toJsonArray(data.seaGoals),
        focusServices: toJsonArray(data.focusServices),
        adBudget: data.adBudget || null,
        conversionType: data.conversionType || null,
        priorities: toJsonArray(data.priorities),
        extraContext: data.extraContext || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "intake"] });
      toast({ title: "Intake bijgewerkt", description: "Je kunt nu de strategie opnieuw genereren." });
      navigate(`/projects/${projectId}`);
    },
    onError: (err: Error) => {
      toast({ title: "Fout bij opslaan", description: err.message, variant: "destructive" });
    },
  });

  if (projLoading || intakeLoading) {
    return <div className="p-6 max-w-3xl mx-auto space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
  }

  if (!project) {
    return <div className="p-6 max-w-3xl mx-auto text-center py-20"><p className="text-muted-foreground">Project niet gevonden.</p></div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground mb-4">
        <Link href={`/projects/${projectId}`}><ArrowLeft className="w-4 h-4" />Terug naar dashboard</Link>
      </Button>
      <h1 className="text-xl font-bold mb-1">Intake bewerken</h1>
      <p className="text-sm text-muted-foreground mb-6">Pas de gegevens aan en genereer de strategie opnieuw.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
          {/* Company */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm">Bedrijfsgegevens</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel className="text-xs">Bedrijfsnaam</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="domain" render={({ field }) => (<FormItem><FormLabel className="text-xs">Website</FormLabel><FormControl><Input {...field} placeholder="example.nl" /></FormControl></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="industry" render={({ field }) => (<FormItem><FormLabel className="text-xs">Sector</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="businessModel" render={({ field }) => (<FormItem><FormLabel className="text-xs">Model</FormLabel><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="B2B">B2B</SelectItem><SelectItem value="B2C">B2C</SelectItem><SelectItem value="B2B+B2C">B2B + B2C</SelectItem></SelectContent></Select></FormItem>)} />
              </div>
              <FormField control={form.control} name="productsServices" render={({ field }) => (<FormItem><FormLabel className="text-xs">Producten/Diensten (komma-gescheiden)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="targetAudience" render={({ field }) => (<FormItem><FormLabel className="text-xs">Doelgroep</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </CardContent>
          </Card>

          {/* Market */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm">Markt & Concurrentie</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel className="text-xs">Land</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="region" render={({ field }) => (<FormItem><FormLabel className="text-xs">Regio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="language" render={({ field }) => (<FormItem><FormLabel className="text-xs">Taal</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="competitors" render={({ field }) => (<FormItem><FormLabel className="text-xs">Concurrenten (komma-gescheiden)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </CardContent>
          </Card>

          {/* Goals */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm">Doelen & Budget</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="seoGoals" render={({ field }) => (<FormItem><FormLabel className="text-xs">SEO doelen</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="seaGoals" render={({ field }) => (<FormItem><FormLabel className="text-xs">SEA doelen</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="adBudget" render={({ field }) => (<FormItem><FormLabel className="text-xs">Budget (€/maand)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="conversionType" render={({ field }) => (<FormItem><FormLabel className="text-xs">Conversiedoel</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="focusServices" render={({ field }) => (<FormItem><FormLabel className="text-xs">Focusdiensten</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            </CardContent>
          </Card>

          {/* Extra */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm">Extra context</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <FormField control={form.control} name="priorities" render={({ field }) => (<FormItem><FormLabel className="text-xs">Prioriteiten</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="extraContext" render={({ field }) => (<FormItem><FormLabel className="text-xs">Extra context / klantenkaart</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl></FormItem>)} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => navigate(`/projects/${projectId}`)}>Annuleren</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="gap-1.5">
              {saveMutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Opslaan & terug
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
