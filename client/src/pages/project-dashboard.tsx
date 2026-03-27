import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  Zap, Calendar, Building2, FileText, Search, Target,
  BarChart2, Eye, Layers, Megaphone, Type, ShieldMinus, MapPin,
  TrendingUp, CheckSquare, Star, DollarSign, Users, Globe, Clock, Monitor, Lightbulb,
  Download, Pencil, Copy, CheckCheck, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  exportKeywordsCSV, exportPillarCSV, exportCampaignsCSV,
  exportAdCopyCSV, exportChecklistCSV, exportTop20CSV,
  exportFullDashboard, copyAdCopyToClipboard, copyAllAdCopyToClipboard,
} from "@/lib/export-utils";
import type { Project, Client, Intake } from "@shared/schema";

function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }); } catch { return dateStr; }
}
function parseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const TABS = [
  { id: "overview", label: "Overzicht", icon: Eye },
  { id: "keywords", label: "Zoekwoorden", icon: Search },
  { id: "pillar", label: "Pijler-Cluster", icon: Layers },
  { id: "campaigns", label: "Campagnes", icon: Megaphone },
  { id: "adcopy", label: "Ad Copy", icon: Type },
  { id: "targeting", label: "Targeting", icon: MapPin },
  { id: "negatives", label: "Uitsluitingen", icon: ShieldMinus },
  { id: "performance", label: "Performance", icon: TrendingUp },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
] as const;
type TabId = typeof TABS[number]["id"];

interface DashboardData { overview: any; seoKeywords: any; pillarCluster: any; seaCampaigns: any; adCopy: any; negatives: any; targeting: any; performance: any; checklist: any; }

export default function ProjectDashboard() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [generateStatus, setGenerateStatus] = useState("");
  const [generateStep, setGenerateStep] = useState(0);
  const [generateTotalSteps, setGenerateTotalSteps] = useState(3);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function startTimer() {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  useEffect(() => () => stopTimer(), []);

  const nullOn404 = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const res = await fetch(queryKey.join("/"));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  };

  const { data: project, isLoading: projectLoading } = useQuery<Project>({ queryKey: ["/api/projects", projectId] });
  const { data: client } = useQuery<Client>({ queryKey: ["/api/clients", project?.clientId], enabled: !!project?.clientId });
  const { data: intake } = useQuery<Intake | null>({ queryKey: ["/api/projects", projectId, "intake"], queryFn: nullOn404, enabled: !!projectId });
  const { data: dashboardRaw, isLoading: dashLoading } = useQuery<any>({ queryKey: ["/api/projects", projectId, "strategy-dashboard"], queryFn: nullOn404, enabled: !!projectId });

  const dash: DashboardData | null = dashboardRaw ? {
    overview: parseJson(dashboardRaw.overview, null),
    seoKeywords: parseJson(dashboardRaw.seoKeywords, null),
    pillarCluster: parseJson(dashboardRaw.pillarCluster, null),
    seaCampaigns: parseJson(dashboardRaw.seaCampaigns, null),
    adCopy: parseJson(dashboardRaw.adCopy, null),
    negatives: parseJson(dashboardRaw.negatives, null),
    targeting: parseJson(dashboardRaw.targeting, null),
    performance: parseJson(dashboardRaw.performance, null),
    checklist: parseJson(dashboardRaw.checklist, null),
  } : null;

  const generateMutation = useMutation({
    mutationFn: async (type: "seo" | "sea" | "both") => {
      startTimer();
      setGenerateStep(1);
      setGenerateTotalSteps(type === "both" ? 4 : 3);
      setGenerateStatus("Data ophalen...");

      // Step 1: Get intake + keywords from server
      const prepRes = await apiRequest("POST", `/api/projects/${projectId}/prepare`);
      const { intake: intakeData, keywords } = await prepRes.json();

      const kwStr = (keywords || []).slice(0, 50).map((k: any) => `${k.keyword} (vol:${k.volume}, kd:${k.difficulty}, cpc:€${k.cpc})`).join("\n");
      const ci = `Bedrijf: ${intakeData.companyName}\nWebsite: ${intakeData.domain ?? "onbekend"}\nSector: ${intakeData.industry ?? "onbekend"}\nModel: ${intakeData.businessModel ?? "onbekend"}\nRegio: ${intakeData.region ?? intakeData.country ?? "Nederland"}\nDiensten: ${intakeData.productsServices ?? "onbekend"}\nBudget: €${intakeData.adBudget ?? "1000"}/maand\nConcurrenten: ${intakeData.competitors ?? "onbekend"}\nDoelgroep: ${intakeData.targetAudience ?? "onbekend"}`;
      const extra = intakeData.extraContext ? `\n\nKLANTENKAART:\n${intakeData.extraContext}` : "";

      // Get API key for direct browser-to-Claude calls (no Vercel timeout!)
      const keyRes = await apiRequest("POST", "/api/auth/claude-key");
      const { key: apiKey, model } = await keyRes.json();

      async function callClaude(prompt: string) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: "Je bent een JSON API. Antwoord UITSLUITEND met valid JSON. Geen markdown, geen backticks. Start direct met {.",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Claude API fout: ${errText.substring(0, 300)}`);
        }
        const data = await res.json();
        const text = data.content?.map((b: any) => b.text || "").join("") || "";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        if (!cleaned) throw new Error("Leeg antwoord van Claude");

        // Try direct parse
        try { return JSON.parse(cleaned); } catch {}

        // Extract JSON
        const start = cleaned.indexOf("{");
        if (start === -1) throw new Error("Geen JSON gevonden");
        let depth = 0, end = start, inStr = false, esc = false;
        for (let i = start; i < cleaned.length; i++) {
          const ch = cleaned[i];
          if (esc) { esc = false; continue; }
          if (ch === "\\") { esc = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (ch === "{" || ch === "[") depth++;
          if (ch === "}" || ch === "]") { depth--; if (depth === 0) { end = i; break; } }
        }
        let jsonStr = cleaned.substring(start, end + 1);
        if (depth > 0) {
          jsonStr = jsonStr.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
          let ob = 0, oq = 0, s2 = false, e2 = false;
          for (const c of jsonStr) { if (e2) { e2 = false; continue; } if (c === "\\") { e2 = true; continue; } if (c === '"') { s2 = !s2; continue; } if (s2) continue; if (c === "{") ob++; if (c === "}") ob--; if (c === "[") oq++; if (c === "]") oq--; }
          for (let i = 0; i < oq; i++) jsonStr += "]";
          for (let i = 0; i < ob; i++) jsonStr += "}";
        }
        try { return JSON.parse(jsonStr); } catch {}
        return JSON.parse(jsonStr.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]"));
      }

      // Step 2: Generate SEO
      let seoResult: any = null;
      if (type === "seo" || type === "both") {
        setGenerateStep(2);
        setGenerateStatus("SEO & Pijler-Cluster genereren...");
        seoResult = await callClaude(`Je bent een senior SEO-strateeg bij een toonaangevend Nederlands bureau. Genereer een complete, diepgaande SEO-strategie specifiek voor deze klant.

KLANTPROFIEL:
${ci}${extra}

BESCHIKBARE ZOEKWOORDEN:
${kwStr || 'Genereer zelf minimaal 20 relevante keywords met realistische volumes voor deze klant en sector.'}

INSTRUCTIES:
- Analyseer het klantprofiel grondig — alle output moet 100% klantspecifiek zijn
- Gebruik de klantenkaart/extra context als primaire bron indien aanwezig
- Groepeer keywords op intentie en relevantie voor deze specifieke klant
- Minimaal 15 keywords, 4 categorieën, 4 pijlers met elk minimaal 3 clusters
- Adviseer ook kansen die de klant zelf niet ziet

JSON: {"categories":[{"name":"str","color":"#hex","totalVolume":0,"keywords":[{"keyword":"str","volume":0,"isHighlight":false}]}],"pillars":[{"name":"str","slug":"/str/","description":"strategische beschrijving gericht op klant","icon":"emoji","color":"#hex","totalVolume":0,"clusters":[{"name":"str","slug":"/str/","intent":"informatief|commercieel|transactioneel","keywords":[{"keyword":"str","volume":0}]}]}],"totalKeywords":0,"totalVolume":0}`);

      }

      // Step 3: Generate SEA
      let seaResult: any = null;
      if (type === "sea" || type === "both") {
        setGenerateStep(type === "both" ? 3 : 2);
        setGenerateStatus("SEA & Campagnes genereren...");
        seaResult = await callClaude(`Je bent een elite Google Ads specialist. Ontwerp een agency-grade SEA-strategie specifiek voor deze klant die morgen live kan.

KLANTPROFIEL:
${ci}${extra}
Budget: €${intakeData.adBudget ?? '1000'}/maand

BESCHIKBARE ZOEKWOORDEN:
${kwStr || 'Genereer zelf minimaal 15 high-intent keywords voor Google Ads voor deze klant en sector.'}

INSTRUCTIES:
- Alle campagnenames, headlines en descriptions moeten 100% klantspecifiek zijn
- Gebruik de klantenkaart/extra context als primaire bron indien aanwezig
- Minimaal 4 campagnes, 5 keywords per campagne, 6 headlines per campagne, 2 descriptions
- Minimaal 8 negatieve keywords op accountniveau
- Adviseer ook kansen die de klant zelf niet ziet (nieuw product, seizoen, regio)

JSON: {"campaigns":[{"name":"str","type":"Product|Generiek|Remarketing|Brand","color":"#hex","keywords":[{"keyword":"str","matchType":"exact|phrase|broad","volume":0,"cpc":0}],"budget":0,"budgetPercent":0,"landingPage":"/str/","headlines":[{"text":"max30ch","type":"KEYWORD|USP_DIENST|CTA"}],"descriptions":["max90ch"]}],"negativeKeywords":{"accountLevel":[{"keywords":"str","reason":"str"}],"crossCampaign":[{"campaign":"str","excludes":["str"]}]},"targeting":{"locations":[{"name":"str","radius":"str"}],"schedule":{"days":"str","hours":"str"},"devices":[{"type":"Desktop|Mobile","bidAdjust":"str"}],"audiences":["str"]},"performance":{"forecast":[{"metric":"str","value":"str","note":"str"}],"growthPlan":[{"phase":1,"title":"str","description":"str"}]}}`);

      }

      // Step 4: Overview
      setGenerateStep(type === "both" ? 4 : 3);
      setGenerateStatus("Dashboard samenvatten...");
      const overviewResult = await callClaude(`Je bent een strategisch adviseur. Maak een executive dashboard samenvatting voor deze klant.

KLANTPROFIEL:
${ci}${extra}
Budget: €${intakeData.adBudget ?? '1000'}/maand
${seoResult ? `SEO: ${seoResult.totalKeywords ?? '?'} keywords, ${seoResult.totalVolume ?? '?'} totaal volume` : ''}
${seaResult ? `SEA: ${seaResult.campaigns?.length ?? 0} campagnes` : ''}

INSTRUCTIES:
- Alle teksten en aanbevelingen moeten 100% klantspecifiek zijn
- Top 5 keywords moeten echt relevant zijn voor deze klant
- Quick wins moeten direct uitvoerbaar zijn voor deze klant
- Minimaal 5 strategische bullets, 10 checklist items, top 15 keywords

JSON: {"kpis":{"totalVolume":0,"seoScore":0,"seaScore":0,"trafficPotential":"str","estimatedLeads":"str"},"topKeywords":[{"keyword":"str","volume":0,"intent":"str","reason":"str"}],"quickWins":{"seo":[{"action":"str","impact":"str"}],"sea":[{"action":"str","impact":"str"}]},"strategyBullets":["str"],"checklist":[{"task":"str","category":"str","priority":"high|medium|low"}],"top20":[{"keyword":"str","volume":0,"intent":"str","type":"SEO|SEA","score":0}]}`);


      // Save
      setGenerateStatus("Opslaan...");
      const saveBody = {
        overview: JSON.stringify(overviewResult),
        seoKeywords: JSON.stringify(seoResult?.categories ?? []),
        pillarCluster: JSON.stringify(seoResult?.pillars ?? []),
        seaCampaigns: JSON.stringify(seaResult?.campaigns ?? []),
        adCopy: JSON.stringify((seaResult?.campaigns ?? []).map((c: any) => ({ name: c.name, color: c.color, headlines: c.headlines ?? [], descriptions: c.descriptions ?? [] }))),
        negatives: JSON.stringify(seaResult?.negativeKeywords ?? {}),
        targeting: JSON.stringify(seaResult?.targeting ?? {}),
        performance: JSON.stringify(seaResult?.performance ?? {}),
        checklist: JSON.stringify(overviewResult?.checklist ?? []),
      };
      try { await apiRequest("POST", `/api/projects/${projectId}/save-dashboard`, saveBody); } catch (e) { console.warn("Dashboard save:", e); }
      try { await apiRequest("POST", `/api/projects/${projectId}/save-strategy`, {
        summary: { executiveSummary: overviewResult?.strategyBullets?.join("\n\n") ?? "", keyFindings: JSON.stringify(overviewResult?.topKeywords ?? []), recommendations: JSON.stringify(overviewResult?.strategyBullets ?? []), implementationChecklist: JSON.stringify(overviewResult?.checklist ?? []), performanceEstimates: JSON.stringify(seaResult?.performance?.forecast ?? []) },
        ...(seoResult ? { seo: { keywords: JSON.stringify(seoResult.categories?.flatMap((c: any) => c.keywords) ?? []), clusters: JSON.stringify(seoResult.pillars?.map((p: any) => ({ name: p.name, pillarKeyword: p.name, totalVolume: p.totalVolume, avgDifficulty: 0, intent: "commercial", keywords: p.clusters?.flatMap((c: any) => c.keywords) ?? [] })) ?? []), pillarPages: JSON.stringify(seoResult.pillars?.map((p: any) => ({ title: p.name, slug: p.slug, pillarKeyword: p.name, totalVolume: p.totalVolume, clusterPages: p.clusters?.map((c: any) => ({ title: c.name, slug: c.slug, keyword: c.keywords?.[0]?.keyword ?? "" })) ?? [] })) ?? []), contentIdeas: "[]", internalLinks: "[]", metadata: "[]", priorityMatrix: "[]" } } : {}),
        ...(seaResult ? { sea: { campaigns: JSON.stringify(seaResult.campaigns ?? []), adGroups: JSON.stringify([]), negativeKeywords: JSON.stringify(seaResult.negativeKeywords?.accountLevel?.map((n: any) => n.keywords) ?? []), adCopy: "{}", budgetAllocation: JSON.stringify((seaResult.campaigns ?? []).map((c: any) => ({ name: c.name, budget: c.budget ?? 0, percent: c.budgetPercent ?? 0 }))), landingPages: "[]", bidStrategy: "[]" } } : {}),
      }); } catch (e) { console.warn("Legacy save:", e); }

      stopTimer();
      setGenerateStatus("");
      return { success: true };
    },
    onSuccess: () => {
      stopTimer();
      setGenerateStep(0);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "strategy-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "seo"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "sea"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "summary"] });
      toast({ title: "Dashboard gegenereerd", description: "Het strategiedashboard is succesvol aangemaakt." });
    },
    onError: (err: Error) => { stopTimer(); setGenerateStep(0); setGenerateStatus(""); toast({ title: "Fout bij genereren", description: err.message, variant: "destructive" }); },
  });

  if (projectLoading) return <div className="p-6 space-y-5 max-w-6xl mx-auto"><Skeleton className="h-8 w-40 rounded" /><Skeleton className="h-20 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
  if (!project) return <div className="p-6 max-w-6xl mx-auto text-center py-20"><p className="text-muted-foreground">Project niet gevonden.</p><Button variant="outline" asChild className="mt-4"><Link href="/">Terug</Link></Button></div>;

  const availableTabs = dash ? TABS.filter(t => {
    const d = dash[t.id === "keywords" ? "seoKeywords" : t.id === "pillar" ? "pillarCluster" : t.id === "campaigns" ? "seaCampaigns" : t.id as keyof DashboardData];
    return d && (Array.isArray(d) ? d.length > 0 : Object.keys(d).length > 0);
  }) : [];
  const safeTab = availableTabs.find(t => t.id === activeTab) ? activeTab : availableTabs[0]?.id ?? "overview";

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
        {client && (<><span>/</span><Link href={`/clients/${client.id}`} className="hover:text-foreground transition-colors">{client.name}</Link></>)}
        <span>/</span><span className="text-foreground font-medium truncate">{project.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><FileText className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <StatusBadge status={project.status as any} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" /><span>{formatDate(project.createdAt)}</span></div>
              {client && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="w-3 h-3" /><Link href={`/clients/${client.id}`} className="hover:text-foreground transition-colors">{client.name}</Link></div>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {generateMutation.isPending ? (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm font-medium">{generateStatus}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</span>
              </div>
              <div className="flex items-center gap-2 w-full max-w-[280px]">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(generateStep / generateTotalSteps) * 100}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{generateStep}/{generateTotalSteps}</span>
              </div>
            </div>
          ) : (<>
            {dash && (
              <Button variant="outline" size="sm" onClick={() => exportFullDashboard(dash, project.name)} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />Export
              </Button>
            )}
            {intake && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/edit`)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />Intake
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => generateMutation.mutate("seo")} className="gap-1.5"><Search className="w-3.5 h-3.5" />SEO</Button>
            <Button variant="outline" size="sm" onClick={() => generateMutation.mutate("sea")} className="gap-1.5"><Target className="w-3.5 h-3.5" />SEA</Button>
            <Button size="sm" onClick={() => generateMutation.mutate("both")} className="gap-1.5"><Zap className="w-3.5 h-3.5" />Beide</Button>
          </>)}
        </div>
      </div>

      {intake && (
        <Card className="border border-border/60 bg-muted/20"><CardContent className="px-5 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
            {intake.companyName && <span><span className="font-medium text-foreground">Bedrijf:</span> {intake.companyName}</span>}
            {intake.industry && <span><span className="font-medium text-foreground">Sector:</span> {intake.industry}</span>}
            {intake.businessModel && <span><span className="font-medium text-foreground">Model:</span> {intake.businessModel}</span>}
            {(intake.region || intake.country) && <span><span className="font-medium text-foreground">Regio:</span> {intake.region ?? intake.country}</span>}
            {intake.adBudget && <span><span className="font-medium text-foreground">Budget:</span> €{intake.adBudget}/mnd</span>}
          </div>
        </CardContent></Card>
      )}

      {dashLoading && !dash ? (
        <div className="space-y-4"><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-80 w-full rounded-xl" /></div>
      ) : dash && availableTabs.length > 0 ? (<>
        <div className="flex gap-1.5 flex-wrap sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-border/40">
          {availableTabs.map(tab => { const Icon = tab.icon; return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all", safeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40")}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ); })}
        </div>
        <div className="min-h-[400px]">
            {safeTab === "overview" && <><TabExportBar onExport={() => dash.overview?.top20?.length && exportTop20CSV(dash.overview.top20)} label="Top 20 → XLSX" /><OverviewTab data={dash.overview} /></>}
            {safeTab === "keywords" && <><TabExportBar onExport={() => exportKeywordsCSV(dash.seoKeywords)} label="Zoekwoorden → XLSX" /><KeywordsTab data={dash.seoKeywords} /></>}
            {safeTab === "pillar" && <><TabExportBar onExport={() => exportPillarCSV(dash.pillarCluster)} label="Pijler-Cluster → XLSX" /><PillarTab data={dash.pillarCluster} /></>}
            {safeTab === "campaigns" && <><TabExportBar onExport={() => exportCampaignsCSV(dash.seaCampaigns)} label="Campagnes → XLSX" /><CampaignsTab data={dash.seaCampaigns} /></>}
            {safeTab === "adcopy" && <><TabExportBar onExport={() => exportAdCopyCSV(dash.adCopy)} label="Ad Copy → XLSX" secondAction={() => { copyAllAdCopyToClipboard(dash.adCopy); setCopiedId("all-adcopy"); setTimeout(() => setCopiedId(null), 2000); }} secondLabel={copiedId === "all-adcopy" ? "Gekopieerd!" : "Kopieer alles"} /><AdCopyTab data={dash.adCopy} copiedId={copiedId} onCopy={(id: string) => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }} /></>}
            {safeTab === "targeting" && <TargetingTab data={dash.targeting} />}
            {safeTab === "negatives" && <NegativesTab data={dash.negatives} />}
            {safeTab === "performance" && <PerformanceTab data={dash.performance} />}
            {safeTab === "checklist" && <><TabExportBar onExport={() => exportChecklistCSV(dash.checklist)} label="Checklist → XLSX" /><ChecklistTab data={dash.checklist} checked={checkedItems} onToggle={(i) => setCheckedItems(p => ({ ...p, [i]: !p[i] }))} /></>}
        </div>
      </>) : (
        <Card className="border border-dashed border-border/60"><CardContent className="py-20 text-center">
          <BarChart2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-1">Nog geen strategie gegenereerd</p>
          <p className="text-xs text-muted-foreground/60">Klik op SEO, SEA of Beide om het dashboard te genereren</p>
        </CardContent></Card>
      )}
    </div>
  );
}

// ═══════ TAB COMPONENTS ═══════

function OverviewTab({ data }: { data: any }) {
  if (!data) return null;
  const kpis = data.kpis ?? {};
  const topKw = Array.isArray(data.topKeywords) ? data.topKeywords : [];
  const qw = data.quickWins ?? {};
  const bullets = Array.isArray(data.strategyBullets) ? data.strategyBullets : [];
  const top20 = Array.isArray(data.top20) ? data.top20 : [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[{ l: "Zoekvolume", v: kpis.totalVolume?.toLocaleString("nl-NL") ?? "—", i: TrendingUp }, { l: "SEO Score", v: kpis.seoScore ?? "—", i: Search }, { l: "SEA Score", v: kpis.seaScore ?? "—", i: Target }, { l: "Traffic Potentie", v: kpis.trafficPotential ?? "—", i: Users }, { l: "Geschatte Leads", v: kpis.estimatedLeads ?? "—", i: Star }].map(({ l, v, i: Icon }) => (
          <Card key={l} className="border border-border/60"><CardContent className="p-4 text-center"><Icon className="w-4 h-4 text-primary mx-auto mb-1.5" /><p className="text-lg font-bold tabular-nums">{v}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>
      {bullets.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-3 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" />Strategische Samenvatting</CardTitle></CardHeader><CardContent className="px-5 pb-5 space-y-2">{bullets.map((b: string, i: number) => (<div key={i} className="flex items-start gap-2.5"><div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-primary">{i + 1}</div><p className="text-sm text-muted-foreground">{b}</p></div>))}</CardContent></Card>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[{ title: "Quick Wins SEO", items: Array.isArray(qw.seo) ? qw.seo : [], icon: Search, color: "text-emerald-500" }, { title: "Quick Wins SEA", items: Array.isArray(qw.sea) ? qw.sea : [], icon: Target, color: "text-blue-500" }].map(({ title, items, icon: Icon, color }) => items.length > 0 && (
          <Card key={title} className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Icon className={cn("w-4 h-4", color)} />{title}</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-2">{items.map((item: any, i: number) => (<div key={i} className="text-xs text-muted-foreground p-2 rounded bg-muted/30"><span className="font-medium text-foreground">{item.action}</span>{item.impact && <span className="block mt-0.5 opacity-70">Impact: {item.impact}</span>}</div>))}</CardContent></Card>
        ))}
      </div>
      {top20.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-primary" />Top {top20.length} Zoekwoorden</CardTitle></CardHeader><CardContent className="px-5 pb-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{top20.map((kw: any, i: number) => (<div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/30"><span className="w-5 text-right font-bold text-muted-foreground/50 tabular-nums">{i + 1}</span><span className="flex-1 truncate font-medium">{kw.keyword}</span><span className="text-muted-foreground tabular-nums">{kw.volume?.toLocaleString("nl-NL")}</span><Badge variant="outline" className="text-[9px] px-1.5 py-0">{kw.intent}</Badge></div>))}</div></CardContent></Card>}
      {topKw.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Prioriteitszoekwoorden</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-2">{topKw.slice(0, 5).map((kw: any, i: number) => (<div key={i} className="flex items-start gap-3 p-2 rounded bg-muted/20"><div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{i + 1}</div><div className="flex-1 min-w-0"><span className="text-sm font-semibold">{kw.keyword}</span><span className="text-xs text-muted-foreground block">{kw.reason}</span></div><div className="text-right shrink-0"><span className="text-sm font-bold tabular-nums">{kw.volume?.toLocaleString("nl-NL")}</span><span className="text-[10px] text-muted-foreground block">{kw.intent}</span></div></div>))}</CardContent></Card>}
    </div>
  );
}

function KeywordsTab({ data }: { data: any }) {
  const categories = Array.isArray(data) ? data : [];
  if (!categories.length) return <EmptyState msg="Geen zoekwoorddata." />;
  return (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{categories.map((cat: any, ci: number) => { const maxVol = Math.max(...(cat.keywords ?? []).map((k: any) => k.volume ?? 0), 1); return (
    <Card key={ci} className="border border-border/60 overflow-hidden"><div className="h-0.5" style={{ background: cat.color ?? "hsl(var(--primary))" }} /><CardHeader className="pb-2 pt-4 px-4"><div className="flex justify-between items-start"><div><CardTitle className="text-sm">{cat.name}</CardTitle><p className="text-[10px] text-muted-foreground mt-0.5">{cat.keywords?.length ?? 0} zoekwoorden</p></div><div className="text-right"><p className="text-lg font-bold tabular-nums" style={{ color: cat.color }}>{(cat.totalVolume ?? 0).toLocaleString("nl-NL")}</p><p className="text-[9px] text-muted-foreground uppercase">mnd. volume</p></div></div></CardHeader>
    <CardContent className="px-4 pb-4 space-y-1">{(cat.keywords ?? []).map((kw: any, ki: number) => (<div key={ki} className="flex items-center gap-2 text-xs py-0.5">{kw.isHighlight && <Star className="w-3 h-3 text-amber-400 shrink-0" />}<span className={cn("flex-1 truncate", !kw.isHighlight && "ml-5")}>{kw.keyword}</span><span className="text-muted-foreground tabular-nums w-12 text-right">{(kw.volume ?? 0).toLocaleString("nl-NL")}</span><div className="w-16 h-1 bg-muted rounded-full overflow-hidden shrink-0"><div className="h-full rounded-full" style={{ width: `${((kw.volume ?? 0) / maxVol) * 100}%`, background: cat.color ?? "hsl(var(--primary))" }} /></div></div>))}</CardContent></Card>
  ); })}</div>);
}

function PillarTab({ data }: { data: any }) {
  const pillars = Array.isArray(data) ? data : [];
  if (!pillars.length) return <EmptyState msg="Geen pijler-clustermodel." />;
  const totalVol = pillars.reduce((s: number, p: any) => s + (p.totalVolume ?? 0), 0);
  const totalClusters = pillars.reduce((s: number, p: any) => s + (p.clusters?.length ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-12 flex-wrap">{[{ l: "Pijlers", v: pillars.length }, { l: "Clusters", v: totalClusters }, { l: "Totaal Volume", v: totalVol.toLocaleString("nl-NL") }].map(({ l, v }) => (<div key={l} className="text-center"><p className="text-2xl font-bold text-primary tabular-nums">{v}</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{l}</p></div>))}</div>
      {pillars.map((pillar: any, pi: number) => (
        <div key={pi} className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${pillar.color ?? "hsl(var(--primary))"}20` }}>{pillar.icon ?? "📄"}</div>
            <div className="flex-1 min-w-0"><h3 className="font-bold text-base">{pillar.name}</h3><p className="text-xs text-muted-foreground font-mono">{pillar.slug}</p>{pillar.description && <p className="text-xs text-muted-foreground mt-0.5">{pillar.description}</p>}</div>
            <div className="text-right shrink-0"><p className="text-lg font-bold tabular-nums" style={{ color: pillar.color }}>{(pillar.totalVolume ?? 0).toLocaleString("nl-NL")}</p><p className="text-[9px] text-muted-foreground uppercase">totaal volume</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{(pillar.clusters ?? []).map((cluster: any, ci: number) => (
            <Card key={ci} className="border border-border/60 hover:border-primary/20 transition-colors overflow-hidden"><div className="h-0.5 opacity-0 group-hover:opacity-100" style={{ background: pillar.color }} /><CardContent className="p-4">
              <p className="text-sm font-semibold mb-0.5">{cluster.name}</p><p className="text-[10px] text-muted-foreground font-mono mb-2">{cluster.slug}</p>
              {cluster.intent && <Badge variant="outline" className={cn("text-[9px] mb-2", cluster.intent === "commercieel" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : cluster.intent === "transactioneel" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20")}>{cluster.intent}</Badge>}
              <div className="space-y-1 mt-2">{(cluster.keywords ?? []).map((kw: any, ki: number) => (<div key={ki} className="flex items-center gap-2 text-xs"><span className="flex-1 truncate">{kw.keyword}</span><span className="font-semibold tabular-nums" style={{ color: pillar.color }}>{(kw.volume ?? 0).toLocaleString("nl-NL")}</span></div>))}</div>
              {cluster.subclusters?.length > 0 && <div className="mt-3 pt-2 border-t border-border/40 space-y-1">{cluster.subclusters.map((sc: any, si: number) => (<div key={si}><Badge variant="outline" className="text-[8px] mb-1" style={{ background: `${pillar.color}15`, color: pillar.color }}>{sc.name}</Badge>{(sc.keywords ?? []).map((kw: any, ki: number) => (<div key={ki} className="flex items-center gap-2 text-[11px] text-muted-foreground ml-2"><span className="flex-1 truncate">{kw.keyword}</span><span className="tabular-nums">{(kw.volume ?? 0).toLocaleString("nl-NL")}</span></div>))}</div>))}</div>}
            </CardContent></Card>
          ))}</div>
        </div>
      ))}
    </div>
  );
}

function CampaignsTab({ data }: { data: any }) {
  const campaigns = Array.isArray(data) ? data : [];
  if (!campaigns.length) return <EmptyState msg="Geen campagnedata." />;
  const maxVol = Math.max(...campaigns.map((c: any) => (c.keywords ?? []).reduce((s: number, k: any) => s + (k.volume ?? 0), 0)), 1);
  return (
    <div className="space-y-4">
      <Card className="border border-border/60"><CardContent className="p-5"><div className="flex items-end gap-4 h-40 justify-center">{campaigns.map((c: any, i: number) => { const vol = (c.keywords ?? []).reduce((s: number, k: any) => s + (k.volume ?? 0), 0); return (
        <div key={i} className="flex flex-col items-center gap-2 flex-1 max-w-[120px]"><div className="w-full h-32 flex items-end justify-center"><div className="w-10 rounded-t relative" style={{ height: `${Math.max((vol / maxVol) * 100, 5)}%`, background: c.color ?? "hsl(var(--primary))" }}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap" style={{ color: c.color }}>{vol.toLocaleString("nl-NL")}</span></div></div><p className="text-[9px] text-muted-foreground text-center uppercase leading-tight">{c.name}<br />{c.keywords?.length ?? 0} kw's</p></div>
      ); })}</div></CardContent></Card>
      {campaigns.map((c: any, i: number) => (
        <Card key={i} className="border border-border/60 overflow-hidden"><div className="h-1" style={{ background: c.color ?? "hsl(var(--primary))" }} /><CardContent className="p-5">
          <div className="flex items-start justify-between mb-3"><div><p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: c.color }}>Campagne {i + 1} — {c.type}</p><p className="text-base font-bold">{c.name}</p></div><div className="flex gap-2"><Badge variant="outline" className="text-xs">{c.keywords?.length ?? 0} keywords</Badge>{c.budget > 0 && <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">€{c.budget}/mnd</Badge>}</div></div>
          <div className="space-y-1 mb-3">{(c.keywords ?? []).map((kw: any, ki: number) => (<div key={ki} className="flex items-center gap-2 text-xs p-1 rounded bg-muted/20"><Badge variant="outline" className={cn("text-[9px] px-1.5", kw.matchType === "exact" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : kw.matchType === "phrase" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20")}>{kw.matchType}</Badge><span className="flex-1">{kw.keyword}</span><span className="text-muted-foreground tabular-nums">{(kw.volume ?? 0).toLocaleString("nl-NL")}/m</span>{kw.cpc > 0 && <span className="text-muted-foreground tabular-nums">€{kw.cpc}</span>}</div>))}</div>
          {c.landingPage && <p className="text-xs text-muted-foreground font-mono">→ {c.landingPage}</p>}
        </CardContent></Card>
      ))}
    </div>
  );
}

function AdCopyTab({ data, copiedId, onCopy }: { data: any; copiedId?: string | null; onCopy?: (id: string) => void }) {
  const campaigns = Array.isArray(data) ? data : [];
  if (!campaigns.length) return <EmptyState msg="Geen ad copy." />;
  const tc: Record<string, string> = { KEYWORD: "bg-blue-500/10 text-blue-600 border-blue-500/20", USP_DIENST: "bg-amber-500/10 text-amber-600 border-amber-500/20", USP_BEDRIJF: "bg-purple-500/10 text-purple-600 border-purple-500/20", SOCIAL_PROOF: "bg-pink-500/10 text-pink-600 border-pink-500/20", CTA: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  return (
    <div className="space-y-6">
      {campaigns.map((c: any, ci: number) => {
        const cid = `adcopy-${ci}`;
        return (
          <div key={ci}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: c.color ?? "hsl(var(--primary))" }} />
                <span className="font-bold text-sm">{c.name}</span>
                <span className="text-xs text-muted-foreground">— {c.headlines?.length ?? 0} headlines</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => { copyAdCopyToClipboard(c); onCopy?.(cid); }}>
                {copiedId === cid ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedId === cid ? "Gekopieerd" : "Kopieer"}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {(c.headlines ?? []).map((h: any, hi: number) => (
                <div key={hi} className="p-2.5 rounded-lg border border-border/40 bg-muted/10">
                  <p className="text-xs font-semibold mb-1">{typeof h === "string" ? h : h.text}</p>
                  {h.type && <Badge variant="outline" className={cn("text-[8px]", tc[h.type] ?? "")}>{h.type.replace("_", " ")}</Badge>}
                </div>
              ))}
            </div>
            {(c.descriptions ?? []).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Beschrijvingen:</p>
                {c.descriptions.map((d: string, di: number) => (
                  <p key={di} className="text-xs p-2 rounded bg-muted/20 border border-border/30">{di + 1}. {d}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TargetingTab({ data }: { data: any }) {
  if (!data) return <EmptyState msg="Geen targeting data." />;
  return (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {data.locations?.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Locatie</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-2">{data.locations.map((loc: any, i: number) => (<div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/20"><Globe className="w-3.5 h-3.5 text-primary shrink-0" /><span className="font-medium">{loc.name}</span>{loc.radius && <Badge variant="outline" className="text-[9px]">{loc.radius}</Badge>}</div>))}</CardContent></Card>}
    {data.schedule && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Dag & Tijd</CardTitle></CardHeader><CardContent className="px-5 pb-4"><p className="text-xs"><span className="font-medium">Dagen:</span> {data.schedule.days}</p><p className="text-xs mt-1"><span className="font-medium">Uren:</span> {data.schedule.hours}</p></CardContent></Card>}
    {data.devices?.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" />Apparaten</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-1.5">{data.devices.map((d: any, i: number) => (<div key={i} className="flex justify-between text-xs"><span>{d.type}</span><span className="font-medium">{d.bidAdjust}</span></div>))}</CardContent></Card>}
    {data.audiences?.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Doelgroepen</CardTitle></CardHeader><CardContent className="px-5 pb-4"><div className="flex flex-wrap gap-1.5">{data.audiences.map((a: string, i: number) => (<Badge key={i} variant="outline" className="text-xs">{a}</Badge>))}</div></CardContent></Card>}
  </div>);
}

function NegativesTab({ data }: { data: any }) {
  if (!data) return <EmptyState msg="Geen uitsluitingen." />;
  const al = Array.isArray(data.accountLevel) ? data.accountLevel : [];
  const cc = Array.isArray(data.crossCampaign) ? data.crossCampaign : [];
  return (<div className="space-y-6">
    {al.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm">Account-Level</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-2">{al.map((n: any, i: number) => (<div key={i} className="flex items-start gap-3 p-2 rounded bg-muted/20"><span className="text-base font-bold text-destructive/60 w-6 text-right tabular-nums shrink-0">{i + 1}</span><div><p className="text-xs font-semibold">{n.keywords}</p><p className="text-[10px] text-muted-foreground">{n.reason}</p></div></div>))}</CardContent></Card>}
    {cc.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm">Cross-Campagne</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-2">{cc.map((n: any, i: number) => (<div key={i} className="p-3 rounded-lg border border-border/40 bg-muted/10"><p className="text-xs font-bold mb-1">{n.campaign}</p><p className="text-[10px] text-muted-foreground">Sluit uit: <span className="font-semibold text-foreground">{(n.excludes ?? []).map((e: string) => `−${e}`).join(", ")}</span></p>{n.reason && <p className="text-[10px] text-muted-foreground mt-0.5">{n.reason}</p>}</div>))}</CardContent></Card>}
  </div>);
}

function PerformanceTab({ data }: { data: any }) {
  if (!data) return <EmptyState msg="Geen performance data." />;
  const forecast = Array.isArray(data.forecast) ? data.forecast : [];
  const gp = Array.isArray(data.growthPlan) ? data.growthPlan : [];
  return (<div className="space-y-6">
    {forecast.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Forecast</CardTitle></CardHeader><CardContent className="px-5 pb-4"><table className="w-full text-xs"><thead><tr className="border-b border-border/60"><th className="text-left py-2 font-semibold">Metric</th><th className="text-left py-2 font-semibold">Forecast</th><th className="text-left py-2 font-semibold">Toelichting</th></tr></thead><tbody>{forecast.map((f: any, i: number) => (<tr key={i} className="border-b border-border/20"><td className="py-2 font-medium">{f.metric}</td><td className="py-2 font-bold text-primary tabular-nums">{f.value}</td><td className="py-2 text-muted-foreground">{f.note}</td></tr>))}</tbody></table></CardContent></Card>}
    {gp.length > 0 && <Card className="border border-border/60"><CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />Groeiplan</CardTitle></CardHeader><CardContent className="px-5 pb-4 space-y-3">{gp.map((p: any, i: number) => (<div key={i} className="flex gap-3 items-start"><div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{p.phase ?? i + 1}</div><div><p className="text-sm font-bold">{p.title}</p><p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p></div></div>))}</CardContent></Card>}
  </div>);
}

function ChecklistTab({ data, checked, onToggle }: { data: any; checked: Record<number, boolean>; onToggle: (i: number) => void }) {
  const items = Array.isArray(data) ? data : [];
  if (!items.length) return <EmptyState msg="Geen checklist." />;
  const cc = Object.values(checked).filter(Boolean).length;
  const pct = items.length > 0 ? Math.round((cc / items.length) * 100) : 0;
  const pc: Record<string, string> = { high: "bg-red-500/10 text-red-600 border-red-500/20", medium: "bg-amber-500/10 text-amber-600 border-amber-500/20", low: "bg-muted text-muted-foreground border-border" };
  return (<div className="space-y-4">
    <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground tabular-nums">{cc}/{items.length}</span><div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div><span className="text-xs font-bold tabular-nums">{pct}%</span></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{items.map((item: any, i: number) => { const ic = checked[i] ?? false; return (
      <button key={i} onClick={() => onToggle(i)} className={cn("flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all", ic ? "border-emerald-500/20 bg-emerald-500/5 opacity-60" : "border-border/60 hover:bg-muted/20")}>
        <div className={cn("w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center", ic ? "bg-primary border-primary" : "border-muted-foreground/30")}>{ic && <span className="text-[10px] text-primary-foreground font-bold">✓</span>}</div>
        <div className="flex-1 min-w-0"><p className={cn("text-xs", ic && "line-through")}>{item.task}</p><div className="flex items-center gap-1.5 mt-1">{item.category && <span className="text-[9px] text-muted-foreground">{item.category}</span>}{item.priority && <Badge variant="outline" className={cn("text-[8px] px-1 py-0", pc[item.priority] ?? "")}>{item.priority}</Badge>}</div></div>
      </button>
    ); })}</div>
  </div>);
}

function TabExportBar({ onExport, label, secondAction, secondLabel }: { onExport: () => void; label: string; secondAction?: () => void; secondLabel?: string }) {
  return (
    <div className="flex items-center justify-end gap-2 mb-3">
      {secondAction && (
        <Button variant="ghost" size="sm" onClick={secondAction} className="h-7 px-2.5 text-[11px] gap-1.5">
          <Copy className="w-3 h-3" />{secondLabel}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onExport} className="h-7 px-2.5 text-[11px] gap-1.5">
        <Download className="w-3 h-3" />{label}
      </Button>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <Card className="border border-dashed border-border/60"><CardContent className="py-16 text-center"><BarChart2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">{msg}</p></CardContent></Card>;
}
