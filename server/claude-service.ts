/**
 * Claude AI Strategy Service — Agency Grade
 *
 * Claude is the central intelligence layer. It interprets keyword data,
 * generates strategic insights, classifies intent, clusters keywords,
 * designs campaign architectures, and produces actionable recommendations.
 *
 * Designed for SEA-first thinking with conversion-focused output.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  Intake,
  KeywordEntry,
  InsertSeo,
  InsertSea,
  InsertStrategySummary,
} from "@shared/schema";
import { storage } from "./storage";

// ─── Client ──────────────────────────────────────────────────────────────────

async function getClient(): Promise<Anthropic> {
  const dbKey = await storage.getSetting("anthropic_api_key");
  const apiKey = dbKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key is niet ingesteld. Ga naar Instellingen om deze toe te voegen.");
  return new Anthropic({ apiKey });
}

async function getModel(): Promise<string> {
  const dbModel = await storage.getSetting("ai_model");
  return dbModel || "claude-sonnet-4-20250514";
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

function buildSeoPrompt(intake: Intake, keywords: KeywordEntry[]): string {
  const services = intake.productsServices ?? "onbekend";
  const region = intake.region ?? intake.country ?? "Nederland";
  const model = intake.businessModel ?? "onbekend";

  return `Je bent een senior SEO-strateeg bij een toonaangevend Nederlands performance marketingbureau. Je werkt voor een echte klant en je output moet DIRECT bruikbaar zijn door hun marketingteam.

## KLANTPROFIEL
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Sector: ${intake.industry ?? "onbekend"}
- Business model: ${model}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- Regio: ${region}
- Diensten/producten: ${services}
- Concurrenten: ${intake.competitors ?? "onbekend"}

## KEYWORD DATA (${keywords.length} zoekwoorden van DataForSEO)
${JSON.stringify(keywords.slice(0, 60), null, 2)}

## OPDRACHT
Analyseer deze data als een senior SEO-lead. Denk in:
- Welke keywords zijn quick wins (laag KD, goed volume)?
- Waar liggen de grootste contentkansen voor deze specifieke klant?
- Hoe bouw je een pillar-cluster model dat past bij hun diensten: ${services}?
- Welke zoekintentie past bij welke fase in de funnel?

Genereer ALLEEN een valid JSON object (geen markdown, geen uitleg, geen backticks):

{
  "keywords": [
    {
      "keyword": "string",
      "volume": number,
      "difficulty": number,
      "cpc": number,
      "intent": "informational" | "navigational" | "transactional" | "commercial",
      "category": "primary" | "secondary" | "long-tail",
      "cluster": "string (thematische groepering specifiek voor ${intake.companyName})",
      "opportunityScore": number (1-100, hoger = betere kans),
      "funnelPhase": "awareness" | "consideration" | "decision",
      "aiInsight": "string (1 zin: waarom dit keyword relevant is voor ${intake.companyName})"
    }
  ],
  "clusters": [
    {
      "name": "string (naam gerelateerd aan diensten van ${intake.companyName})",
      "pillarKeyword": "string",
      "keywords": [{ "keyword": "string", "volume": number, "difficulty": number, "cpc": number, "intent": "string", "category": "string" }],
      "totalVolume": number,
      "avgDifficulty": number,
      "intent": "string",
      "aiAnalysis": "string (2-3 zinnen: kansen en aanpak specifiek voor ${intake.companyName})"
    }
  ],
  "pillarPages": [
    {
      "title": "string (pagina-titel voor ${intake.domain ?? intake.companyName})",
      "slug": "string",
      "pillarKeyword": "string",
      "clusterPages": [{"title": "string", "slug": "string", "keyword": "string"}],
      "totalVolume": number,
      "contentBrief": "string (korte brief: doel, doelgroep, kernboodschap, CTA — specifiek voor ${intake.companyName})"
    }
  ],
  "contentIdeas": [
    {
      "title": "string",
      "type": "pillar" | "cluster" | "blog" | "landing",
      "keyword": "string",
      "intent": "string",
      "estimatedWords": number,
      "priority": "high" | "medium" | "low",
      "aiRationale": "string (waarom dit content stuk waardevol is voor ${intake.companyName})"
    }
  ],
  "internalLinks": [
    {"from": "string", "to": "string", "anchorText": "string", "type": "pillar-to-cluster" | "cluster-to-pillar" | "blog-to-landing" | "cross-cluster"}
  ],
  "metadata": [
    {"page": "string", "keyword": "string", "titleTag": "string (max 60 chars)", "metaDescription": "string (max 155 chars)", "h1": "string", "urlSlug": "string"}
  ],
  "priorityMatrix": [
    {
      "keyword": "string",
      "volume": number,
      "difficulty": number,
      "cpc": number,
      "intent": "string",
      "priority": "quick-win" | "high-value" | "long-term" | "low-priority",
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high",
      "recommendation": "string (concrete actie voor het marketingteam)"
    }
  ]
}

BELANGRIJK: Alle output moet specifiek zijn voor ${intake.companyName} in de sector ${intake.industry ?? "onbekend"} in ${region}. Geen generieke marketing keywords.`;
}

function buildSeaPrompt(intake: Intake, keywords: KeywordEntry[]): string {
  const budget = intake.adBudget ?? "1000";
  const services = intake.productsServices ?? "onbekend";
  const region = intake.region ?? intake.country ?? "Nederland";
  const model = intake.businessModel ?? "onbekend";

  return `Je bent een elite Google Ads specialist bij een bureau dat miljoenenbudgetten beheert. Je denkt in conversies, ROAS en schaalbaarheid. Je output moet DIRECT implementeerbaar zijn in Google Ads.

## KLANTPROFIEL
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Business model: ${model}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- Regio: ${region}
- Diensten/producten: ${services}
- Concurrenten: ${intake.competitors ?? "onbekend"}
- Maandelijks budget: €${budget}
- Conversietype: ${intake.conversionType ?? "lead"}

## KEYWORD DATA (${keywords.length} zoekwoorden)
${JSON.stringify(keywords.slice(0, 60), null, 2)}

## OPDRACHT — SEA-FIRST MINDSET
Ontwerp een complete Google Ads strategie alsof je morgen live gaat. Denk in:
- Welke campagnestructuur maximaliseert conversies binnen €${budget}/maand?
- Welke keywords hebben de hoogste conversie-intentie?
- Hoe verdeel je budget optimaal over campagnes?
- Welke negatieve keywords voorkomen verspilling?
- Welke ad copy converteert voor ${model} in ${intake.industry ?? "deze sector"}?

Genereer ALLEEN een valid JSON object (geen markdown, geen backticks):

{
  "campaigns": [
    {
      "name": "string (campagnenaam voor ${intake.companyName})",
      "type": "Search" | "Display / RLSA" | "Performance Max",
      "objective": "string",
      "budget": number,
      "budgetPercent": number,
      "priority": "high" | "medium" | "low",
      "adGroups": [
        {
          "name": "string",
          "keywords": [{"keyword": "string", "matchType": "Exact" | "Phrase" | "Broad", "volume": number}],
          "headlines": ["string (max 30 chars, 15 stuks, in het Nederlands, specifiek voor ${intake.companyName})"],
          "descriptions": ["string (max 90 chars, 4 stuks, overtuigend, met CTA)"],
          "landingPage": "string"
        }
      ],
      "aiInsight": "string (strategische toelichting: waarom deze campagne, verwachte ROAS, risico's)"
    }
  ],
  "negativeKeywords": ["string (minimaal 30 relevante negatieve keywords voor ${intake.industry ?? "deze sector"})"],
  "adCopy": {
    "campaigns": [
      {"name": "string", "adGroups": [{"name": "string", "headlines": ["string"], "descriptions": ["string"]}]}
    ]
  },
  "budgetAllocation": [
    {"campaign": "string", "budget": number, "percentage": number, "rationale": "string (waarom dit % voor deze campagne)"}
  ],
  "landingPages": [
    {
      "url": "string",
      "campaign": "string",
      "headline": "string",
      "cta": "string",
      "conversionGoal": "string",
      "elements": ["string"],
      "aiOptimizationTips": "string (concrete tips voor hogere conversieratio)"
    }
  ],
  "bidStrategy": [
    {
      "campaign": "string",
      "strategy": "string",
      "targetCpa": null,
      "targetRoas": null,
      "rationale": "string",
      "phaseIn": "string (wanneer overstappen naar geautomatiseerd bieden)"
    }
  ]
}

BELANGRIJK: Headlines en descriptions moeten in het Nederlands, specifiek voor ${intake.companyName}, en direct bruikbaar in Google Ads RSA formaat. Geen generieke teksten.`;
}

function buildSummaryPrompt(intake: Intake, keywords: KeywordEntry[], seoJson: string, seaJson: string): string {
  const totalVolume = keywords.reduce((s, k) => s + k.volume, 0);
  const avgDiff = Math.round(keywords.reduce((s, k) => s + k.difficulty, 0) / (keywords.length || 1));
  const avgCpc = (keywords.reduce((s, k) => s + k.cpc, 0) / (keywords.length || 1)).toFixed(2);

  return `Je bent een senior marketing consultant die een strategisch rapport schrijft voor het managementteam van ${intake.companyName}.

## KLANTPROFIEL
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Sector: ${intake.industry ?? "onbekend"}
- Business model: ${intake.businessModel ?? "onbekend"}
- Regio: ${intake.region ?? intake.country ?? "Nederland"}
- Budget: €${intake.adBudget ?? "1000"}/maand
- Diensten: ${intake.productsServices ?? "onbekend"}

## DATA SAMENVATTING
- ${keywords.length} zoekwoorden geanalyseerd
- Totaal zoekvolume: ${totalVolume.toLocaleString("nl-NL")}/maand
- Gemiddelde moeilijkheid: ${avgDiff}/100
- Gemiddelde CPC: €${avgCpc}

## OPDRACHT
Schrijf een professioneel strategisch rapport. Geen AI-taal, geen disclaimers. Schrijf alsof je een senior consultant bent die dit rapport aan de directie presenteert.

Genereer ALLEEN een valid JSON object (geen markdown, geen backticks):

{
  "executiveSummary": "string (3-4 alinea's, professioneel Nederlands, met concrete cijfers en aanbevelingen specifiek voor ${intake.companyName}. Gebruik \\n\\n voor nieuwe alinea's.)",
  "keyFindings": ["string (8-12 concrete, data-gedreven bevindingen specifiek voor ${intake.companyName})"],
  "recommendations": ["string (10 concrete, geprioriteerde aanbevelingen — begin elke aanbeveling met een actiewerkwoord)"],
  "implementationChecklist": [
    {
      "task": "string (concrete taak)",
      "category": "Technische SEO" | "On-page SEO" | "Off-page SEO" | "SEA Setup" | "SEA Optimalisatie" | "Content" | "Rapportage" | "Conversie",
      "priority": "high" | "medium" | "low",
      "status": "pending",
      "aiNote": "string (waarom dit belangrijk is voor ${intake.companyName})"
    }
  ],
  "performanceEstimates": [
    {
      "metric": "string",
      "current": "string",
      "month3": "string",
      "month6": "string",
      "month12": "string",
      "confidence": "hoog" | "gemiddeld" | "laag"
    }
  ],
  "aiStrategicInsights": [
    {
      "title": "string (pakkende titel)",
      "insight": "string (2-3 zinnen, concreet en actionable)",
      "impact": "high" | "medium" | "low",
      "category": "kans" | "risico" | "trend" | "quick-win"
    }
  ]
}

BELANGRIJK: Alles moet specifiek zijn voor ${intake.companyName}. Geen generieke marketing adviezen.`;
}

// ─── Claude API Call ──────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<any> {
  const client = await getClient();
  const model = await getModel();

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[Claude] Failed to parse JSON response:", cleaned.substring(0, 500));
    throw new Error("Claude gaf een ongeldig antwoord. Probeer het opnieuw.");
  }
}

// ─── Main Strategy Generator ──────────────────────────────────────────────────

export interface GeneratedStrategy {
  seo: InsertSeo;
  sea: InsertSea;
  summary: InsertStrategySummary;
}

export async function generateStrategyWithClaude(
  intake: Intake,
  keywords: KeywordEntry[]
): Promise<GeneratedStrategy> {
  console.log(`[Claude] Generating strategy for ${intake.companyName} with ${keywords.length} keywords...`);

  // Limit keywords sent to Claude to avoid token bloat
  const topKeywords = keywords.slice(0, 30);

  // Step 1: Run SEO and SEA in PARALLEL to save time
  console.log("[Claude] Step 1/2: SEO + SEA strategy (parallel)...");
  const [seoResult, seaResult] = await Promise.all([
    callClaude(buildSeoPrompt(intake, topKeywords)),
    callClaude(buildSeaPrompt(intake, topKeywords)),
  ]);

  // Step 2: Quick summary (uses smaller context)
  console.log("[Claude] Step 2/2: Executive summary...");
  const summaryResult = await callClaude(
    buildSummaryPrompt(
      intake,
      topKeywords,
      JSON.stringify((seoResult.clusters ?? []).slice(0, 3).map((c: any) => c.name)),
      JSON.stringify((seaResult.campaigns ?? []).slice(0, 3).map((c: any) => c.name))
    )
  );

  console.log("[Claude] Strategy generation complete!");

  return {
    seo: {
      projectId: intake.projectId,
      keywords: JSON.stringify(seoResult.keywords ?? []),
      clusters: JSON.stringify(seoResult.clusters ?? []),
      pillarPages: JSON.stringify(seoResult.pillarPages ?? []),
      contentIdeas: JSON.stringify(seoResult.contentIdeas ?? []),
      internalLinks: JSON.stringify(seoResult.internalLinks ?? []),
      metadata: JSON.stringify(seoResult.metadata ?? []),
      priorityMatrix: JSON.stringify(seoResult.priorityMatrix ?? []),
    },
    sea: {
      projectId: intake.projectId,
      campaigns: JSON.stringify(seaResult.campaigns ?? []),
      adGroups: JSON.stringify(
        (seaResult.campaigns ?? []).flatMap((c: any) => c.adGroups ?? [])
      ),
      negativeKeywords: JSON.stringify(seaResult.negativeKeywords ?? []),
      adCopy: JSON.stringify(seaResult.adCopy ?? {}),
      budgetAllocation: JSON.stringify(seaResult.budgetAllocation ?? []),
      landingPages: JSON.stringify(seaResult.landingPages ?? []),
      bidStrategy: JSON.stringify(seaResult.bidStrategy ?? []),
    },
    summary: {
      projectId: intake.projectId,
      executiveSummary: summaryResult.executiveSummary ?? "",
      keyFindings: JSON.stringify(summaryResult.keyFindings ?? []),
      recommendations: JSON.stringify(summaryResult.recommendations ?? []),
      implementationChecklist: JSON.stringify(summaryResult.implementationChecklist ?? []),
      performanceEstimates: JSON.stringify(summaryResult.performanceEstimates ?? []),
    },
  };
}
