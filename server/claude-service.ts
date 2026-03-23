/**
 * Claude AI Strategy Service
 *
 * Uses Claude as the central intelligence layer to interpret keyword data,
 * generate strategic insights, classify intent, cluster keywords, and
 * produce actionable marketing recommendations.
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
  // Try DB settings first, then env var
  const dbKey = await storage.getSetting("anthropic_api_key");
  const apiKey = dbKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key is niet ingesteld. Ga naar Instellingen om deze toe te voegen.");
  return new Anthropic({ apiKey });
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

function buildSeoPrompt(intake: Intake, keywords: KeywordEntry[]): string {
  return `Je bent een senior SEO-strateeg voor de Nederlandse markt. Analyseer de volgende data en genereer een volledige SEO-strategie.

## Bedrijfscontext
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Sector: ${intake.industry ?? "onbekend"}
- Business model: ${intake.businessModel ?? "onbekend"}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- Regio: ${intake.region ?? intake.country ?? "Nederland"}
- Diensten: ${intake.productsServices ?? "onbekend"}
- SEO doelen: ${intake.seoGoals ?? "meer organisch verkeer en leads"}
- Concurrenten: ${intake.competitors ?? "onbekend"}

## Keyword Data (${keywords.length} zoekwoorden)
${JSON.stringify(keywords.slice(0, 50), null, 2)}

## Opdracht
Genereer een JSON object met EXACT deze structuur (geen markdown, geen uitleg, alleen valid JSON):

{
  "keywords": [
    {
      "keyword": "string",
      "volume": number,
      "difficulty": number,
      "cpc": number,
      "intent": "informational" | "navigational" | "transactional" | "commercial",
      "category": "primary" | "secondary" | "long-tail",
      "cluster": "string (clusternaam)",
      "opportunityScore": number (1-100),
      "funnelPhase": "awareness" | "consideration" | "decision",
      "aiInsight": "string (korte strategische notitie)"
    }
  ],
  "clusters": [
    {
      "name": "string",
      "pillarKeyword": "string",
      "keywords": ["keyword strings"],
      "totalVolume": number,
      "avgDifficulty": number,
      "intent": "string",
      "aiAnalysis": "string (2-3 zinnen over kansen en aanpak voor dit cluster)"
    }
  ],
  "pillarPages": [
    {
      "title": "string",
      "slug": "string",
      "pillarKeyword": "string",
      "clusterPages": [{"title": "string", "slug": "string", "keyword": "string"}],
      "totalVolume": number,
      "contentBrief": "string (korte brief: doel, doelgroep, kernboodschap, CTA)"
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
      "aiRationale": "string (waarom dit stuk content waardevol is)"
    }
  ],
  "internalLinks": [
    {
      "from": "string (url)",
      "to": "string (url)",
      "anchorText": "string",
      "type": "pillar-to-cluster" | "cluster-to-pillar" | "blog-to-landing" | "cross-cluster"
    }
  ],
  "metadata": [
    {
      "page": "string",
      "keyword": "string",
      "titleTag": "string (max 60 chars)",
      "metaDescription": "string (max 155 chars)",
      "h1": "string",
      "urlSlug": "string"
    }
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
      "recommendation": "string (concrete actie)"
    }
  ]
}

Wees concreet, strategisch en actionable. Focus op de Nederlandse markt. Prioriteer quick wins.`;
}

function buildSeaPrompt(intake: Intake, keywords: KeywordEntry[]): string {
  const budget = intake.adBudget ?? "1000";
  return `Je bent een senior Google Ads strateeg. Ontwerp een complete SEA-strategie op basis van de volgende data.

## Bedrijfscontext
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Business model: ${intake.businessModel ?? "onbekend"}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- Regio: ${intake.region ?? intake.country ?? "Nederland"}
- Diensten: ${intake.productsServices ?? "onbekend"}
- SEA doelen: ${intake.seaGoals ?? "meer leads en conversies"}
- Concurrenten: ${intake.competitors ?? "onbekend"}
- Maandelijks budget: €${budget}
- Conversietype: ${intake.conversionType ?? "lead"}

## Keyword Data (${keywords.length} zoekwoorden)
${JSON.stringify(keywords.slice(0, 50), null, 2)}

## Opdracht
Genereer een JSON object met EXACT deze structuur (geen markdown, alleen valid JSON):

{
  "campaigns": [
    {
      "name": "string",
      "type": "Search" | "Display / RLSA" | "Performance Max",
      "objective": "string",
      "budget": number,
      "budgetPercent": number,
      "adGroups": [
        {
          "name": "string",
          "keywords": [{"keyword": "string", "matchType": "Exact" | "Phrase" | "Broad", "volume": number}],
          "headlines": ["string (max 30 chars each, 15 headlines)"],
          "descriptions": ["string (max 90 chars each, 4 descriptions)"],
          "landingPage": "string"
        }
      ],
      "aiInsight": "string (strategische toelichting voor deze campagne)"
    }
  ],
  "negativeKeywords": ["string"],
  "adCopy": {
    "campaigns": [
      {
        "name": "string",
        "adGroups": [{"name": "string", "headlines": ["string"], "descriptions": ["string"]}]
      }
    ]
  },
  "budgetAllocation": [
    {
      "campaign": "string",
      "budget": number,
      "percentage": number,
      "rationale": "string"
    }
  ],
  "landingPages": [
    {
      "url": "string",
      "campaign": "string",
      "headline": "string",
      "cta": "string",
      "conversionGoal": "string",
      "elements": ["string"],
      "aiOptimizationTips": "string"
    }
  ],
  "bidStrategy": [
    {
      "campaign": "string",
      "strategy": "string",
      "targetCpa": number | null,
      "targetRoas": number | null,
      "rationale": "string",
      "phaseIn": "string"
    }
  ]
}

Schrijf overtuigende Nederlandse RSA-advertenties. Wees specifiek en resultaatgericht.`;
}

function buildSummaryPrompt(intake: Intake, keywords: KeywordEntry[], seoData: any, seaData: any): string {
  return `Je bent een senior marketing consultant die een executive summary schrijft voor het managementteam.

## Bedrijfscontext
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Sector: ${intake.industry ?? "onbekend"}
- Business model: ${intake.businessModel ?? "onbekend"}
- Regio: ${intake.region ?? intake.country ?? "Nederland"}
- Budget: €${intake.adBudget ?? "1000"}/maand

## Analyse Resultaten
- ${keywords.length} zoekwoorden geanalyseerd
- Totaal zoekvolume: ${keywords.reduce((s, k) => s + k.volume, 0).toLocaleString("nl-NL")}/maand
- Gemiddelde moeilijkheid: ${Math.round(keywords.reduce((s, k) => s + k.difficulty, 0) / (keywords.length || 1))}/100
- Gemiddelde CPC: €${(keywords.reduce((s, k) => s + k.cpc, 0) / (keywords.length || 1)).toFixed(2)}
- SEO clusters: ${seoData?.clusters ? JSON.parse(seoData.clusters).length : "onbekend"}
- SEA campagnes: ${seaData?.campaigns ? JSON.parse(seaData.campaigns).length : "onbekend"}

## Opdracht
Genereer een JSON object met EXACT deze structuur (geen markdown, alleen valid JSON):

{
  "executiveSummary": "string (3-4 alinea's, professioneel, in het Nederlands, met concrete cijfers en aanbevelingen)",
  "keyFindings": ["string (8-12 concrete bevindingen met data)"],
  "recommendations": ["string (10 concrete, prioriteerde aanbevelingen)"],
  "implementationChecklist": [
    {
      "task": "string",
      "category": "Technische SEO" | "On-page SEO" | "Off-page SEO" | "SEA" | "Content" | "Rapportage" | "Conversie",
      "priority": "high" | "medium" | "low",
      "status": "pending",
      "aiNote": "string (korte toelichting waarom dit belangrijk is)"
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
      "title": "string",
      "insight": "string (2-3 zinnen)",
      "impact": "high" | "medium" | "low",
      "category": "kans" | "risico" | "trend" | "quick-win"
    }
  ]
}

Wees specifiek, data-gedreven en actionable. Schrijf voor een Nederlands marketingteam.`;
}

// ─── Claude API Call ──────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<any> {
  const client = await getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse JSON from response - handle markdown code fences
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

  // Step 1: Generate SEO strategy
  console.log("[Claude] Step 1/3: Generating SEO strategy...");
  const seoResult = await callClaude(buildSeoPrompt(intake, keywords));

  // Step 2: Generate SEA strategy
  console.log("[Claude] Step 2/3: Generating SEA strategy...");
  const seaResult = await callClaude(buildSeaPrompt(intake, keywords));

  // Step 3: Generate executive summary with context from SEO + SEA
  console.log("[Claude] Step 3/3: Generating executive summary...");
  const summaryResult = await callClaude(
    buildSummaryPrompt(intake, keywords, seoResult, seaResult)
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
