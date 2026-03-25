/**
 * Claude AI Strategy Service — Agency Grade
 *
 * Claude is the central intelligence layer. It interprets keyword data,
 * generates strategic insights, classifies intent, clusters keywords,
 * designs campaign architectures, and produces actionable recommendations.
 *
 * Powered by the Marketing Strategy Engine: senior-level SEO/SEA reasoning,
 * commercial framing, and directly actionable output.
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

// ─── System Prompt — Marketing Strategy Engine Persona ───────────────────────

const MARKETING_SYSTEM_PROMPT = `Je bent een world-class senior online marketeer gespecialiseerd in:
- Technische SEO, on-page SEO, off-page SEO, contentstrategie
- Zoekintentie-analyse en keyword clustering
- Lokale SEO en regionale strategie
- CRO in relatie tot SEO/SEA
- Google Ads campagnestructuur en SEA-strategie
- Paid search keyword research, biedstrategieën en advertentieteksten
- Landingspagina-optimalisatie, budgetverdeling en performance-analyse

Jouw werkwijze:
1. Denk vanuit bedrijfsdoelstelling naar kanaalstrategie, niet andersom.
2. Koppel aanbevelingen aan zoekintentie, funnel-fase en conversiefrictie.
3. Onderscheid quick wins van structureel werk.
4. Prioriteer op verwachte impact, implementatie-effort en afhankelijkheden.
5. Geef de reden achter elke aanbeveling in beknopte zakelijke taal.

Kwaliteitslat — vermijd altijd:
- Lege claims zoals "focus op kwaliteitscontent" zonder te specificeren wat te maken
- Grote keywordlijsten zonder clustering of prioritering
- SEA-structuren zonder campagnelogica, match-type denken of budgetonderbouwing
- SEO-advies dat technische drempels, interne linking of meting negeert
- Kanaalaanbevelingen die niet terugkoppelen naar bedrijfsdoelstellingen

Produceer altijd output die:
- Senior-level is in redenering en toon
- Concreet is in plaats van generiek
- Direct bruikbaar is door een echt bedrijf
- Verankerd is in de verstrekte bedrijfscontext
- Geprioriteerd is (High / Medium / Low)
- Commercieel realistisch is over effort, volgorde en verwachte uitkomsten`;

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
  const goal = intake.seoGoals ?? "organische groei";

  return `## STRATEGISCH KADER

Voordat je de JSON genereert, denk intern (niet in output) door:
- Hoofddoelstelling: ${goal}
- Waardevolste zoekdoelgroepen voor ${intake.companyName}
- Hoogste-intentie kansen in ${intake.industry ?? "deze sector"}
- Grootste drempels of risico's (technisch, competitief, content-gap)
- Balans: kortetermijn demand capture vs. langetermijn demand creation
- Branded vs. non-branded kansen
- Lokale vs. nationale reikwijdte voor ${region}

## KLANTPROFIEL
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Sector: ${intake.industry ?? "onbekend"}
- Business model: ${model}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- Regio: ${region}
- Diensten/producten: ${services}
- Concurrenten: ${intake.competitors ?? "onbekend"}
- SEO-doelstelling: ${goal}
${intake.extraContext ? `
## KLANTENKAART / EXTRA CONTEXT
${intake.extraContext}

BELANGRIJK: Gebruik de klantenkaart als PRIMAIRE bron. Adviseer ook kansen die de klant zelf niet heeft benoemd.
` : ""}
## KEYWORD DATA (${keywords.length > 0 ? keywords.length + " zoekwoorden van DataForSEO" : "Geen externe data — genereer zelf relevante keywords op basis van de klantsector"})
${keywords.map(k => `${k.keyword} (vol:${k.volume}, kd:${k.difficulty}, cpc:${k.cpc})`).join("\n")}

## OPDRACHT — SEO STRATEGIE
Analyseer als senior SEO-lead. Verbind elk keyword aan een specifieke funnel-fase en contentkans voor ${intake.companyName}.

Prioriteer op:
- Quick wins: laag KD (< 30), redelijk volume (> 100/mnd)
- High-value: hoge transactionele intentie, past bij ${services}
- Long-term: hoog volume, hoog KD — voor autoriteitsopbouw

Map content altijd aan realistische paginatypes: servicepagina's, vergelijkingspagina's, guides, locatiepagina's, of case studies.

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
      "opportunityScore": number,
      "funnelPhase": "awareness" | "consideration" | "decision",
      "priority": "High" | "Medium" | "Low",
      "aiInsight": "string (1 zin: commerciële relevantie voor ${intake.companyName})"
    }
  ],
  "clusters": [
    {
      "name": "string",
      "pillarKeyword": "string",
      "intent": "string",
      "funnelPhase": "awareness" | "consideration" | "decision",
      "keywords": [{ "keyword": "string", "volume": number, "difficulty": number, "cpc": number, "intent": "string", "category": "string" }],
      "totalVolume": number,
      "avgDifficulty": number,
      "priority": "High" | "Medium" | "Low",
      "aiAnalysis": "string (2-3 zinnen: kansen, aanpak, en verwachte impact voor ${intake.companyName})"
    }
  ],
  "pillarPages": [
    {
      "title": "string",
      "slug": "string",
      "pillarKeyword": "string",
      "clusterPages": [{"title": "string", "slug": "string", "keyword": "string"}],
      "totalVolume": number,
      "priority": "High" | "Medium" | "Low",
      "contentBrief": "string (doel, doelgroep, kernboodschap, CTA — specifiek voor ${intake.companyName})"
    }
  ],
  "contentIdeas": [
    {
      "title": "string",
      "type": "pillar" | "cluster" | "blog" | "landing",
      "keyword": "string",
      "intent": "string",
      "funnelPhase": "string",
      "estimatedWords": number,
      "priority": "High" | "Medium" | "Low",
      "effort": "Low" | "Medium" | "High",
      "impact": "Low" | "Medium" | "High",
      "aiRationale": "string (waarom dit contentstuk waardevol is voor ${intake.companyName} en welke doelgroep het treft)"
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
      "effort": "Low" | "Medium" | "High",
      "impact": "Low" | "Medium" | "High",
      "recommendation": "string (concrete, specifieke actie — geen generiek advies)"
    }
  ]
}

KWALITEITSLAT: Alle output moet specifiek zijn voor ${intake.companyName} in ${intake.industry ?? "deze sector"} in ${region}. Geen generieke marketing-keywords. Elk keyword, elke cluster en elke aanbeveling moet terugkoppelen aan de bedrijfsdoelstelling: ${goal}.`;
}

function buildSeaPrompt(intake: Intake, keywords: KeywordEntry[]): string {
  const budget = intake.adBudget ?? "1000";
  const services = intake.productsServices ?? "onbekend";
  const region = intake.region ?? intake.country ?? "Nederland";
  const model = intake.businessModel ?? "onbekend";
  const goal = intake.seaGoals ?? "leads genereren";
  const conversion = intake.conversionType ?? "lead";

  return `## STRATEGISCH KADER

Voordat je de JSON genereert, denk intern door:
- Conversiedoelstelling: ${conversion} — wat bepaalt de commerciële waarde?
- Welke campagnestructuur maximaliseert conversies binnen €${budget}/mnd?
- Branded vs. non-branded verdeling voor ${intake.companyName}
- Geografische focus: ${region} — lokaal vs. nationaal bereik
- Welke zoekintentie heeft de hoogste conversiewaarde voor ${model}?
- Hoe verdeelt budget optimaal: demand capture (Exact/Phrase) vs. discovery (Broad/PMax)?
- Welke negatieve keywords zijn kritisch om verspilling te voorkomen in ${intake.industry ?? "deze sector"}?

## KLANTPROFIEL
- Bedrijf: ${intake.companyName}
- Website: ${intake.domain ?? "onbekend"}
- Business model: ${model}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- Regio: ${region}
- Diensten/producten: ${services}
- Concurrenten: ${intake.competitors ?? "onbekend"}
- Maandelijks budget: €${budget}
- Conversietype: ${conversion}
- SEA-doelstelling: ${goal}
${intake.extraContext ? `
## KLANTENKAART / EXTRA CONTEXT
${intake.extraContext}

BELANGRIJK: Gebruik de klantenkaart als PRIMAIRE bron voor campagne-angles en USP's.
` : ""}
## KEYWORD DATA (${keywords.length} zoekwoorden)
${keywords.map(k => `${k.keyword} (vol:${k.volume}, kd:${k.difficulty}, cpc:${k.cpc})`).join("\n")}

## OPDRACHT — SEA STRATEGIE
Ontwerp een complete Google Ads strategie die morgen live kan. Denk in conversies, ROAS en schaalbaarheid.

Campagnelogica:
- Splits campagnes op intentie, productlijn, geografie of funnelfase — alleen als het budgetbeheer, berichtrelevantie of rapportage verbetert
- Prioriteer Exact Match voor hoog-intentie terms, Phrase voor bereik, Broad alleen met sterke negatieve lijsten
- Biedstrategie: start met handmatig CPC of doel-CPA als er voldoende conversiedata is, anders mCPC
- Budget: concentreer op hoog-intentie campagnes eerst — verspreid niet te breed met €${budget}/mnd

Advertentieteksten (RSA formaat):
- Schrijf in het Nederlands, specifiek voor ${intake.companyName}
- Gebruik USP's, sociale bewijslast, urgentie of differentiatie
- Headlines max 30 tekens, descriptions max 90 tekens
- Elke headline en description moet zelfstandig leesbaar zijn

Genereer ALLEEN een valid JSON object (geen markdown, geen backticks):

{
  "campaigns": [
    {
      "name": "string",
      "type": "Search" | "Display / RLSA" | "Performance Max",
      "objective": "string",
      "budget": number,
      "budgetPercent": number,
      "priority": "High" | "Medium" | "Low",
      "matchTypeLogic": "string (onderbouwing van match-type keuzes voor deze campagne)",
      "adGroups": [
        {
          "name": "string",
          "keywords": [{"keyword": "string", "matchType": "Exact" | "Phrase" | "Broad", "volume": number}],
          "headlines": ["string (max 30 chars, min 10 headlines, in het Nederlands)"],
          "descriptions": ["string (max 90 chars, 4 stuks, met CTA)"],
          "landingPage": "string"
        }
      ],
      "aiInsight": "string (strategische toelichting: waarom deze campagne, verwachte CPA/ROAS, risico's en wanneer op te schalen)"
    }
  ],
  "negativeKeywords": ["string (minimaal 30 kritische negatieve keywords voor ${intake.industry ?? "deze sector"} — focus op irrelevante intentie, merken van concurrenten, en informatieve zoekopdrachten die niet converteren)"],
  "adCopy": {
    "campaigns": [
      {"name": "string", "adGroups": [{"name": "string", "headlines": ["string"], "descriptions": ["string"]}]}
    ]
  },
  "budgetAllocation": [
    {
      "campaign": "string",
      "budget": number,
      "percentage": number,
      "priority": "High" | "Medium" | "Low",
      "rationale": "string (concrete onderbouwing: waarom dit percentage, verwachte conversie-opbrengst)"
    }
  ],
  "landingPages": [
    {
      "url": "string",
      "campaign": "string",
      "headline": "string",
      "cta": "string",
      "conversionGoal": "string",
      "elements": ["string (essentiële pagina-elementen voor conversie)"],
      "aiOptimizationTips": "string (3-5 concrete CRO-tips specifiek voor ${intake.companyName})"
    }
  ],
  "bidStrategy": [
    {
      "campaign": "string",
      "strategy": "string",
      "targetCpa": null,
      "targetRoas": null,
      "rationale": "string",
      "phaseIn": "string (concreet: wanneer en bij welke conversie-drempel overstappen naar geautomatiseerd bieden)"
    }
  ]
}

KWALITEITSLAT: Headlines en descriptions moeten direct bruikbaar zijn in Google Ads RSA-formaat. Campagnestructuur moet aansluiten op €${budget}/mnd budget — geen irrealistische versnippering. Elke aanbeveling koppelt terug aan: ${goal}.`;
}

function buildSummaryPrompt(intake: Intake, keywords: KeywordEntry[], seoJson: string, seaJson: string): string {
  const region = intake.region ?? intake.country ?? "Nederland";
  const budget = intake.adBudget ?? "1000";

  return `Schrijf een senior-level strategisch rapport voor ${intake.companyName} (${intake.industry ?? "onbekend"}, ${intake.businessModel ?? "onbekend"}, ${region}).

Context:
- SEO clusters: ${seoJson}
- SEA campagnes: ${seaJson}
- Maandbudget SEA: €${budget}
- Doelgroep: ${intake.targetAudience ?? "onbekend"}
- SEO-doelstelling: ${intake.seoGoals ?? "organische groei"}
- SEA-doelstelling: ${intake.seaGoals ?? "leads genereren"}

Kwaliteitslat:
- Schrijf als senior strateeg, niet als docent
- Geen generieke claims — elk punt moet specifiek zijn voor ${intake.companyName}
- Verbind SEO en SEA: leg uit hoe ze elkaar versterken voor deze klant
- Implementatielijst moet geprioriteerd zijn (High/Medium/Low) en direct uitvoerbaar

Genereer ALLEEN valid JSON (geen markdown, geen backticks):
{
  "executiveSummary": "string (2 krachtige alinea's professioneel Nederlands: situatie + strategie + verwacht resultaat voor ${intake.companyName})",
  "keyFindings": ["string (5-6 concrete bevindingen — geen open deuren, elk gebaseerd op de intake en keyworddata)"],
  "recommendations": ["string (5-6 geprioriteerde aanbevelingen met High/Medium/Low label en korte onderbouwing)"],
  "implementationChecklist": [{"task":"string","category":"SEO" | "SEA" | "CRO" | "Technisch" | "Content","priority":"High" | "Medium" | "Low","status":"pending"}],
  "performanceEstimates": [{"metric":"string","current":"string","month3":"string","month6":"string","month12":"string","confidence":"Hoog" | "Gemiddeld" | "Laag","assumption":"string (aanname achter de schatting)"}]
}`;
}

// ─── Claude API Call ──────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<any> {
  const client = await getClient();
  const model = await getModel();

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: MARKETING_SYSTEM_PROMPT,
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

  let jsonStr = cleaned;
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("[Claude] Failed to parse JSON. First 1000 chars:", jsonStr.substring(0, 1000));
    console.error("[Claude] Parse error:", (e as Error).message);
    throw new Error(`Claude gaf een ongeldig antwoord. Model: ${model}. Probeer het opnieuw of switch naar een ander model in Instellingen.`);
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
  keywords: KeywordEntry[],
  type: "seo" | "sea" | "both" = "both"
): Promise<GeneratedStrategy> {
  console.log(`[Claude] Generating ${type} strategy for ${intake.companyName} with ${keywords.length} keywords...`);

  const topKeywords = keywords.slice(0, 30);
  let seoResult: any = null;
  let seaResult: any = null;
  let summaryResult: any = null;

  if (type === "both") {
    console.log("[Claude] Running SEO + SEA in parallel...");
    [seoResult, seaResult] = await Promise.all([
      callClaude(buildSeoPrompt(intake, topKeywords)),
      callClaude(buildSeaPrompt(intake, topKeywords)),
    ]);
  } else if (type === "seo") {
    console.log("[Claude] Running SEO only...");
    seoResult = await callClaude(buildSeoPrompt(intake, topKeywords));
  } else {
    console.log("[Claude] Running SEA only...");
    seaResult = await callClaude(buildSeaPrompt(intake, topKeywords));
  }

  console.log("[Claude] Generating summary...");
  summaryResult = await callClaude(
    buildSummaryPrompt(
      intake,
      topKeywords,
      seoResult ? JSON.stringify((seoResult.clusters ?? []).slice(0, 3).map((c: any) => c.name)) : "[]",
      seaResult ? JSON.stringify((seaResult.campaigns ?? []).slice(0, 3).map((c: any) => c.name)) : "[]"
    )
  );

  console.log("[Claude] Strategy generation complete!");

  return {
    seo: seoResult ? {
      projectId: intake.projectId,
      keywords: JSON.stringify(seoResult.keywords ?? []),
      clusters: JSON.stringify(seoResult.clusters ?? []),
      pillarPages: JSON.stringify(seoResult.pillarPages ?? []),
      contentIdeas: JSON.stringify(seoResult.contentIdeas ?? []),
      internalLinks: JSON.stringify(seoResult.internalLinks ?? []),
      metadata: JSON.stringify(seoResult.metadata ?? []),
      priorityMatrix: JSON.stringify(seoResult.priorityMatrix ?? []),
    } : null as any,
    sea: seaResult ? {
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
    } : null as any,
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
