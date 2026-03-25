import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Zap,
  Calendar,
  Building2,
  FileText,
  Search,
  Target,
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

  const [generateStatus, setGenerateStatus] = useState("");

  const generateMutation = useMutation({
    mutationFn: async (type: "seo" | "sea" | "both") => {
      // Step 1: Get intake data from backend
      setGenerateStatus("Data ophalen...");
      const prepRes = await apiRequest("POST", `/api/projects/${projectId}/prepare`);
      const { intake: intakeData, keywords, model } = await prepRes.json();

      // Step 1b: Get Claude API key (separate secure call)
      const keyRes = await apiRequest("POST", "/api/auth/claude-key");
      const { key: claudeKey } = await keyRes.json();

      // Build compact keyword string
      const kwStr = (keywords || []).slice(0, 30).map((k: any) =>
        `${k.keyword} (vol:${k.volume}, kd:${k.difficulty}, cpc:${k.cpc})`
      ).join("\n");

      const clientInfo = `Bedrijf: ${intakeData.companyName}, Website: ${intakeData.domain ?? "onbekend"}, Sector: ${intakeData.industry ?? "onbekend"}, Model: ${intakeData.businessModel ?? "onbekend"}, Regio: ${intakeData.region ?? intakeData.country ?? "Nederland"}, Diensten: ${intakeData.productsServices ?? "onbekend"}, Budget: €${intakeData.adBudget ?? "1000"}/maand, Concurrenten: ${intakeData.competitors ?? "onbekend"}`;

      const extraContext = intakeData.extraContext ? `\n\nKLANTENKAART/EXTRA CONTEXT:\n${intakeData.extraContext}\n\nGebruik bovenstaande klantenkaart als PRIMAIRE bron. Analyseer proactief en adviseer ook kansen die de klant niet heeft bedacht.` : "";

      // Direct Claude API call from browser — NO server timeout!
      async function callClaude(prompt: string) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Claude API fout (${res.status}): ${errText.substring(0, 200)}`);
        }
        const data = await res.json();
        const text = data.content?.map((b: any) => b.text || "").join("") || "";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Geen JSON in Claude response");
        return JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
      }

      let seo = null;
      let sea = null;

      // Step 2: Call Claude from browser (no timeout!)
      if (type === "seo" || type === "both") {
        setGenerateStatus("SEO strategie genereren...");
        seo = await callClaude(`Je bent een senior SEO-strateeg bij een toonaangevend Nederlands bureau. Genereer een complete, diepgaande SEO-strategie.
${clientInfo}${extraContext}
Keywords: ${kwStr || "Genereer zelf minimaal 20 relevante keywords met realistische volumes voor deze klant en sector."}

BELANGRIJK:
- Groepeer keywords op intentie (Commercial, Informational, Transactional)
- Koppel elk cluster aan concrete content-ideeën
- Denk als strategisch adviseur: adviseer ook kansen die de klant zelf niet ziet
- Genereer minimaal 15 keywords, 4 clusters, 3 pillar pages

Antwoord ALLEEN met valid JSON:
{"keywords":[{"keyword":"string","volume":0,"difficulty":0,"cpc":0,"intent":"commercial|informational|transactional|navigational","category":"primary|secondary|long-tail","cluster":"string","opportunityScore":80,"funnelPhase":"awareness|consideration|decision","aiInsight":"string"}],"clusters":[{"name":"string","pillarKeyword":"string","keywords":[{"keyword":"string","volume":0,"difficulty":0,"cpc":0,"intent":"string","category":"string"}],"totalVolume":0,"avgDifficulty":0,"intent":"string","aiAnalysis":"string (2-3 zinnen strategische analyse)"}],"pillarPages":[{"title":"string","slug":"string","pillarKeyword":"string","clusterPages":[{"title":"string","slug":"string","keyword":"string"}],"totalVolume":0,"contentBrief":"string (doel, doelgroep, kernboodschap, CTA)"}],"contentIdeas":[{"title":"string","type":"pillar|cluster|blog|landing","keyword":"string","intent":"string","estimatedWords":1000,"priority":"high|medium|low","aiRationale":"string"}],"internalLinks":[{"from":"string","to":"string","anchorText":"string","type":"pillar-to-cluster|cluster-to-pillar|blog-to-landing|cross-cluster"}],"metadata":[{"page":"string","keyword":"string","titleTag":"string (max 60 chars)","metaDescription":"string (max 155 chars)","h1":"string","urlSlug":"string"}],"priorityMatrix":[{"keyword":"string","volume":0,"difficulty":0,"cpc":0,"intent":"string","priority":"quick-win|high-value|long-term|low-priority","effort":"low|medium|high","impact":"low|medium|high","recommendation":"string"}],"conclusion":"string (krachtige conclusie: waarom deze SEO-koers, onderbouwd met data en klantprofiel)"}`);
      }

      if (type === "sea" || type === "both") {
        setGenerateStatus("SEA strategie genereren...");
        sea = await callClaude(`Je bent een elite Google Ads specialist die miljoenenbudgetten beheert. Ontwerp een agency-grade SEA-strategie die morgen live kan.
${clientInfo}${extraContext}
Keywords: ${kwStr || "Genereer zelf relevante high-intent keywords voor Google Ads."}

BELANGRIJK:
- Denk in conversies, ROAS en schaalbaarheid
- Structureer campagnes per dienst/thema
- Schrijf Nederlandse RSA headlines (max 30 chars) en descriptions (max 90 chars)
- Genereer minimaal 30 negatieve keywords
- Adviseer ook campagnes die de klant zelf niet had bedacht

Antwoord ALLEEN met valid JSON:
{"campaigns":[{"name":"string","type":"Search|Display / RLSA|Performance Max","objective":"string","budget":0,"budgetPercent":0,"priority":"high|medium|low","adGroups":[{"name":"string","keywords":[{"keyword":"string","matchType":"Exact|Phrase|Broad","volume":0}],"headlines":["15 Nederlandse headlines max 30 chars"],"descriptions":["4 Nederlandse descriptions max 90 chars"],"landingPage":"string"}],"aiInsight":"string (strategische toelichting, verwachte ROAS)"}],"negativeKeywords":["minimaal 30 negatieve keywords"],"adCopy":{"campaigns":[{"name":"string","adGroups":[{"name":"string","headlines":["string"],"descriptions":["string"]}]}]},"budgetAllocation":[{"campaign":"string","budget":0,"percentage":0,"rationale":"string"}],"landingPages":[{"url":"string","campaign":"string","headline":"string","cta":"string","conversionGoal":"string","elements":["string"],"aiOptimizationTips":"string"}],"bidStrategy":[{"campaign":"string","strategy":"string","targetCpa":null,"targetRoas":null,"rationale":"string","phaseIn":"string"}],"conclusion":"string (waarom deze SEA-strategie, onderbouwd met budget, markt en klantprofiel)"}`);
      }

      setGenerateStatus("Samenvatting genereren...");
      const summary = await callClaude(`Je bent een senior marketing consultant. Schrijf een strategisch rapport voor de directie van ${intakeData.companyName} (${intakeData.industry ?? "onbekend"}, ${intakeData.businessModel ?? "onbekend"}, ${intakeData.region ?? "Nederland"}).${extraContext}
Budget: €${intakeData.adBudget ?? "1000"}/maand. Diensten: ${intakeData.productsServices ?? "onbekend"}.

Antwoord ALLEEN met valid JSON:
{"executiveSummary":"string (3 alinea's, professioneel, met concrete cijfers, gebruik \\n\\n voor alinea's)","keyFindings":["string (8-10 concrete bevindingen)"],"recommendations":["string (8-10 aanbevelingen, begin met actiewerkwoord)"],"implementationChecklist":[{"task":"string","category":"Technische SEO|On-page SEO|Off-page SEO|SEA Setup|Content|Rapportage|Conversie","priority":"high|medium|low","status":"pending"}],"performanceEstimates":[{"metric":"string","current":"string","month3":"string","month6":"string","month12":"string","confidence":"hoog|gemiddeld|laag"}],"conclusion":"string (krachtige conclusie: waarom deze koers de juiste is voor ${intakeData.companyName})"}`);

      // Step 3: Save results to backend
      setGenerateStatus("Opslaan...");
      const saveBody: any = { summary: {
        executiveSummary: summary.executiveSummary ?? "",
        keyFindings: JSON.stringify(summary.keyFindings ?? []),
        recommendations: JSON.stringify(summary.recommendations ?? []),
        implementationChecklist: JSON.stringify(summary.implementationChecklist ?? []),
        performanceEstimates: JSON.stringify(summary.performanceEstimates ?? []),
      }};

      if (seo) {
        saveBody.seo = {
          keywords: JSON.stringify(seo.keywords ?? []),
          clusters: JSON.stringify(seo.clusters ?? []),
          pillarPages: JSON.stringify(seo.pillarPages ?? []),
          contentIdeas: JSON.stringify(seo.contentIdeas ?? []),
          internalLinks: JSON.stringify(seo.internalLinks ?? []),
          metadata: JSON.stringify(seo.metadata ?? []),
          priorityMatrix: JSON.stringify(seo.priorityMatrix ?? []),
        };
      }

      if (sea) {
        saveBody.sea = {
          campaigns: JSON.stringify(sea.campaigns ?? []),
          adGroups: JSON.stringify((sea.campaigns ?? []).flatMap((c: any) => c.adGroups ?? [])),
          negativeKeywords: JSON.stringify(sea.negativeKeywords ?? []),
          adCopy: JSON.stringify(sea.adCopy ?? {}),
          budgetAllocation: JSON.stringify(sea.budgetAllocation ?? []),
          landingPages: JSON.stringify(sea.landingPages ?? []),
          bidStrategy: JSON.stringify(sea.bidStrategy ?? []),
        };
      }

      await apiRequest("POST", `/api/projects/${projectId}/save-strategy`, saveBody);
      setGenerateStatus("");
      return { success: true };
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
      setGenerateStatus("");
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

        {/* Generate buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {generateMutation.isPending ? (
            <Button disabled className="gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {generateStatus || "Genereren..."}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate("seo")}
                disabled={isDataLoading}
                className="gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                SEO
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate("sea")}
                disabled={isDataLoading}
                className="gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                SEA
              </Button>
              <Button
                size="sm"
                onClick={() => generateMutation.mutate("both")}
                disabled={isDataLoading}
                className="gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Beide
              </Button>
            </>
          )}
        </div>
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
