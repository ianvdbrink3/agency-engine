import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2,
  Globe,
  Target,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  Upload,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Schema ─────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  companyName: z.string().min(2, "Bedrijfsnaam is verplicht"),
  domain: z.string().optional(),
  industry: z.string().min(2, "Sector is verplicht"),
  productsServicesRaw: z.string().optional(),
  targetAudience: z.string().optional(),
  businessModel: z.enum(["B2B", "B2C", "Both"]),
});

const step2Schema = z.object({
  country: z.string().min(1, "Land is verplicht"),
  language: z.string().min(1, "Taal is verplicht"),
  region: z.string().optional(),
  competitorsRaw: z.string().optional(),
});

const step3Schema = z.object({
  seoGoalsRaw: z.string().optional(),
  seaGoalsRaw: z.string().optional(),
  focusServicesRaw: z.string().optional(),
  adBudget: z.string().optional(),
  conversionType: z.string().optional(),
});

const step4Schema = z.object({
  prioritiesRaw: z.string().optional(),
  extraContext: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

interface IntakeWizardProps {
  clientId: number;
}

const STEPS = [
  { label: "Bedrijfsgegevens", icon: Building2, description: "Informatie over het bedrijf" },
  { label: "Markt & Concurrentie", icon: Globe, description: "Markt en concurrenten" },
  { label: "Doelen & Strategie", icon: Target, description: "Doelstellingen en budget" },
  { label: "Prioriteiten", icon: Layers, description: "Context en prioriteiten" },
];

// ─── Tag Input ───────────────────────────────────────────────────────────────

function TagInput({
  placeholder,
  value,
  onChange,
  testId,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  const tags = value
    ? value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const [inputValue, setInputValue] = useState("");

  function addTag() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const newTags = [...tags, trimmed];
    onChange(newTags.join(", "));
    setInputValue("");
  }

  function removeTag(index: number) {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags.join(", "));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          data-testid={testId}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          data-testid={testId ? `${testId}-add` : undefined}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-xs bg-primary/5 border-primary/20 text-primary gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="ml-0.5 hover:text-destructive"
                data-testid={`${testId}-remove-${i}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step components ─────────────────────────────────────────────────────────

function Step1({ onNext, defaultValues }: { onNext: (data: Step1Data) => void; defaultValues?: Step1Data }) {
  const form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: defaultValues ?? { businessModel: "B2B" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrijfsnaam *</FormLabel>
                <FormControl>
                  <Input placeholder="Acme BV" {...field} data-testid="input-company-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="www.acme.nl" {...field} data-testid="input-domain" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sector *</FormLabel>
              <FormControl>
                <Input placeholder="E-commerce, SaaS, Bouw..." {...field} data-testid="input-industry" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productsServicesRaw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Producten / Diensten</FormLabel>
              <FormControl>
                <TagInput
                  placeholder="Typ een product en druk Enter"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  testId="input-products"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doelgroep</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Beschrijf de doelgroep..."
                  rows={3}
                  {...field}
                  data-testid="input-target-audience"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bedrijfsmodel *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-business-model">
                    <SelectValue placeholder="Selecteer model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="B2B">B2B – Zakelijke klanten</SelectItem>
                  <SelectItem value="B2C">B2C – Consumenten</SelectItem>
                  <SelectItem value="Both">Beide</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" className="gap-2" data-testid="button-step1-next">
            Volgende
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Step2({
  onNext,
  onBack,
  defaultValues,
}: {
  onNext: (data: Step2Data) => void;
  onBack: () => void;
  defaultValues?: Step2Data;
}) {
  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: defaultValues ?? { country: "Nederland", language: "Nederlands" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Land *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Nederland">Nederland</SelectItem>
                    <SelectItem value="België">België</SelectItem>
                    <SelectItem value="Duitsland">Duitsland</SelectItem>
                    <SelectItem value="Verenigd Koninkrijk">Verenigd Koninkrijk</SelectItem>
                    <SelectItem value="Andere">Andere</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taal *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Nederlands">Nederlands</SelectItem>
                    <SelectItem value="Frans">Frans</SelectItem>
                    <SelectItem value="Duits">Duits</SelectItem>
                    <SelectItem value="Engels">Engels</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Regio / Provincie</FormLabel>
              <FormControl>
                <Input
                  placeholder="Randstad, Noord-Brabant, landelijk..."
                  {...field}
                  data-testid="input-region"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="competitorsRaw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concurrenten</FormLabel>
              <FormControl>
                <TagInput
                  placeholder="Typ een concurrent en druk Enter"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  testId="input-competitors"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="gap-2"
            data-testid="button-step2-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug
          </Button>
          <Button type="submit" className="gap-2" data-testid="button-step2-next">
            Volgende
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Step3({
  onNext,
  onBack,
  defaultValues,
}: {
  onNext: (data: Step3Data) => void;
  onBack: () => void;
  defaultValues?: Step3Data;
}) {
  const form = useForm<Step3Data>({ resolver: zodResolver(step3Schema), defaultValues });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-5">
        <FormField
          control={form.control}
          name="seoGoalsRaw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SEO doelen</FormLabel>
              <FormControl>
                <TagInput
                  placeholder="Meer organisch verkeer, top 3 voor..."
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  testId="input-seo-goals"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seaGoalsRaw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SEA doelen</FormLabel>
              <FormControl>
                <TagInput
                  placeholder="Meer leads, lagere CPA..."
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  testId="input-sea-goals"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="focusServicesRaw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Focus diensten / producten</FormLabel>
              <FormControl>
                <TagInput
                  placeholder="Hoofddienst, product..."
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  testId="input-focus-services"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="adBudget"
            render={({ field }) => {
              const [budgetPeriod, setBudgetPeriod] = useState<"maand" | "dag">("maand");
              const displayValue = field.value ?? "";

              function handlePeriodSwitch(newPeriod: "maand" | "dag") {
                const num = parseFloat(displayValue.replace(/[^0-9.,]/g, "").replace(",", "."));
                if (!isNaN(num) && num > 0) {
                  const converted = newPeriod === "dag" ? Math.round(num / 30.4) : Math.round(num * 30.4);
                  field.onChange(String(converted));
                }
                setBudgetPeriod(newPeriod);
              }

              return (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Advertentiebudget</FormLabel>
                    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                      <button
                        type="button"
                        onClick={() => handlePeriodSwitch("dag")}
                        className={cn(
                          "px-2.5 py-0.5 rounded text-[11px] font-medium transition-all",
                          budgetPeriod === "dag" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        / dag
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePeriodSwitch("maand")}
                        className={cn(
                          "px-2.5 py-0.5 rounded text-[11px] font-medium transition-all",
                          budgetPeriod === "maand" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        / maand
                      </button>
                    </div>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      <Input
                        placeholder={budgetPeriod === "dag" ? "10 – 50" : "300 – 1500"}
                        {...field}
                        className="pl-7"
                        data-testid="input-ad-budget"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">
                        /{budgetPeriod}
                      </span>
                    </div>
                  </FormControl>
                  {displayValue && !isNaN(parseFloat(displayValue.replace(/[^0-9.,]/g, "").replace(",", "."))) && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {budgetPeriod === "dag"
                        ? `≈ €${Math.round(parseFloat(displayValue.replace(/[^0-9.,]/g, "").replace(",", ".")) * 30.4).toLocaleString("nl-NL")}/maand`
                        : `≈ €${Math.round(parseFloat(displayValue.replace(/[^0-9.,]/g, "").replace(",", ".")) / 30.4).toLocaleString("nl-NL")}/dag`
                      }
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="conversionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conversiedoel</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-conversion-type">
                      <SelectValue placeholder="Selecteer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Lead formulier">Lead formulier</SelectItem>
                    <SelectItem value="Telefoongesprek">Telefoongesprek</SelectItem>
                    <SelectItem value="Aankoop">Aankoop</SelectItem>
                    <SelectItem value="Demo aanvraag">Demo aanvraag</SelectItem>
                    <SelectItem value="Offerte aanvraag">Offerte aanvraag</SelectItem>
                    <SelectItem value="Nieuwsbriefinschrijving">Nieuwsbriefinschrijving</SelectItem>
                    <SelectItem value="Anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="gap-2"
            data-testid="button-step3-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug
          </Button>
          <Button type="submit" className="gap-2" data-testid="button-step3-next">
            Volgende
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Step4({
  onSubmit,
  onBack,
  isPending,
}: {
  onSubmit: (data: Step4Data) => void;
  onBack: () => void;
  isPending: boolean;
}) {
  const form = useForm<Step4Data>({ resolver: zodResolver(step4Schema) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="prioritiesRaw"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prioriteiten</FormLabel>
              <FormControl>
                <TagInput
                  placeholder="SEO eerst, lokale zichtbaarheid..."
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  testId="input-priorities"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="extraContext"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extra context</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Aanvullende informatie die nuttig kan zijn voor de strategie..."
                  rows={5}
                  {...field}
                  data-testid="input-extra-context"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="gap-2"
            data-testid="button-step4-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="gap-2 min-w-32"
            data-testid="button-submit-intake"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                Opslaan
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export function IntakeWizard({ clientId }: IntakeWizardProps) {
  const DRAFT_KEY = `intake-draft-${clientId}`;

  // Load draft from localStorage
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }
  const draft = loadDraft();

  const [currentStep, setCurrentStep] = useState(draft?.currentStep ?? 0);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [klantenkaart, setKlantenkaart] = useState<File | null>(null);
  const [klantenkaartText, setKlantenkaartText] = useState<string>(draft?.klantenkaartText ?? "");
  const hasKlantenkaart = !!klantenkaart || !!klantenkaartText;

  const [step1Data, setStep1Data] = useState<Step1Data | null>(draft?.step1Data ?? null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(draft?.step2Data ?? null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(draft?.step3Data ?? null);

  // Save draft to localStorage on any change
  function saveDraft(updates?: Partial<{ currentStep: number; step1Data: any; step2Data: any; step3Data: any; klantenkaartText: string }>) {
    try {
      const d = { currentStep, step1Data, step2Data, step3Data, klantenkaartText, ...updates };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {}
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }

  // Warn before leaving with unsaved data
  useEffect(() => {
    const hasData = step1Data || step2Data || step3Data || klantenkaartText;
    if (!hasData) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [step1Data, step2Data, step3Data, klantenkaartText]);

  // Read uploaded file as text
  async function handleFileUpload(file: File) {
    setKlantenkaart(file);
    try {
      const text = await file.text();
      setKlantenkaartText(text);
    } catch {
      // For non-text files, store filename as context
      setKlantenkaartText(`[Bestand: ${file.name}, type: ${file.type}, grootte: ${(file.size / 1024).toFixed(0)}KB]`);
    }
  }

  const createProjectMutation = useMutation({
    mutationFn: async (step4: Step4Data) => {
      // Create project first
      const projectRes = await apiRequest("POST", "/api/projects", {
        clientId,
        name: step1Data?.companyName
          ? `${step1Data.companyName} – Strategie`
          : "Nieuw project",
        status: "intake",
        createdAt: new Date().toISOString(),
      });
      const project = await projectRes.json();

      // Then save intake data
      const intakePayload = {
        projectId: project.id,
        companyName: step1Data?.companyName ?? "",
        domain: step1Data?.domain ?? null,
        industry: step1Data?.industry ?? null,
        productsServices: step1Data?.productsServicesRaw
          ? JSON.stringify(
              step1Data.productsServicesRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        targetAudience: step1Data?.targetAudience ?? null,
        businessModel: step1Data?.businessModel ?? "B2B",
        country: step2Data?.country ?? null,
        language: step2Data?.language ?? null,
        region: step2Data?.region ?? null,
        competitors: step2Data?.competitorsRaw
          ? JSON.stringify(
              step2Data.competitorsRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        seoGoals: step3Data?.seoGoalsRaw
          ? JSON.stringify(
              step3Data.seoGoalsRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        seaGoals: step3Data?.seaGoalsRaw
          ? JSON.stringify(
              step3Data.seaGoalsRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        focusServices: step3Data?.focusServicesRaw
          ? JSON.stringify(
              step3Data.focusServicesRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        adBudget: step3Data?.adBudget ?? null,
        conversionType: step3Data?.conversionType ?? null,
        priorities: step4.prioritiesRaw
          ? JSON.stringify(
              step4.prioritiesRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          : null,
        extraContext: [
          klantenkaartText ? `[KLANTENKAART]\n${klantenkaartText}\n[/KLANTENKAART]` : "",
          step4.extraContext ?? "",
        ].filter(Boolean).join("\n\n") || null,
      };

      await apiRequest("POST", "/api/intake", intakePayload);
      return project;
    },
    onSuccess: (project) => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "projects"] });
      toast({
        title: "Project aangemaakt",
        description: "De intake is opgeslagen. Je kunt nu de strategie genereren.",
      });
      navigate(`/projects/${project.id}`);
    },
    onError: (err: Error) => {
      toast({
        title: "Fout bij opslaan",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const progressPct = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto" data-testid="intake-wizard">
      {/* Klantenkaart Upload */}
      <Card className="border border-border/60 mb-6">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Klantenkaart uploaden</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload een klantenkaart en de AI extraheert automatisch alle benodigde informatie. De overige velden worden optioneel.
              </p>
              {klantenkaart ? (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 truncate flex-1">{klantenkaart.name}</span>
                  <span className="text-xs text-emerald-600/60">{(klantenkaart.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => { setKlantenkaart(null); setKlantenkaartText(""); }} className="text-muted-foreground hover:text-destructive ml-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="mt-3 flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Klik om een bestand te uploaden</span>
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.csv,.json,.md"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </label>
              )}
              {hasKlantenkaart && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                  Klantenkaart geüpload — alle velden hieronder zijn nu optioneel
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1"
                data-testid={`step-indicator-${i}`}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 fill-current">
                      <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium hidden sm:block",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={progressPct} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-2">
          Stap {currentStep + 1} van {STEPS.length} — {STEPS[currentStep].description}
        </p>
      </div>

      {/* Step content */}
      <Card className="border border-border/60">
        <CardContent className="pt-6 pb-6">
          {currentStep === 0 && (
            <Step1
              defaultValues={step1Data ?? undefined}
              onNext={(data) => {
                setStep1Data(data);
                setCurrentStep(1);
                saveDraft({ step1Data: data, currentStep: 1 });
              }}
            />
          )}
          {currentStep === 1 && (
            <Step2
              defaultValues={step2Data ?? undefined}
              onNext={(data) => {
                setStep2Data(data);
                setCurrentStep(2);
                saveDraft({ step2Data: data, currentStep: 2 });
              }}
              onBack={() => { setCurrentStep(0); saveDraft({ currentStep: 0 }); }}
            />
          )}
          {currentStep === 2 && (
            <Step3
              defaultValues={step3Data ?? undefined}
              onNext={(data) => {
                setStep3Data(data);
                setCurrentStep(3);
                saveDraft({ step3Data: data, currentStep: 3 });
              }}
              onBack={() => { setCurrentStep(1); saveDraft({ currentStep: 1 }); }}
            />
          )}
          {currentStep === 3 && (
            <Step4
              onSubmit={(data) => createProjectMutation.mutate(data)}
              onBack={() => { setCurrentStep(2); saveDraft({ currentStep: 2 }); }}
              isPending={createProjectMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
