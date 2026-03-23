/**
 * Strategy Generator
 *
 * Deterministic (no external AI calls) generation of SEO strategy, SEA strategy,
 * and executive summary from intake data + keyword data.
 */

import type {
  Intake,
  KeywordEntry,
  KeywordCluster,
  PillarPage,
  Campaign,
  AdGroup,
  InsertSeo,
  InsertSea,
  InsertStrategySummary,
  ChecklistItem,
} from "@shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCase(s: string): string {
  return s.split(" ").map(capitalize).join(" ");
}

// Extract the "root word" from a keyword for grouping
function getRootWord(keyword: string): string {
  const words = keyword.toLowerCase().split(" ");
  // Skip common Dutch stop words
  const stopWords = new Set([
    "de", "het", "een", "en", "van", "in", "op", "voor", "met", "aan",
    "bij", "uit", "over", "naar", "te", "is", "zijn", "dat", "dit",
    "wat", "hoe", "waarom", "wie", "welke", "of", "om", "tot", "als",
    "door", "niet", "ook", "maar", "noch", "dan", "zo", "al",
    "nederland", "nederlandse", "amsterdam", "rotterdam",
  ]);
  const meaningful = words.filter((w) => w.length > 3 && !stopWords.has(w));
  return meaningful[0] ?? words[0] ?? keyword;
}

// ─── Intent Classification ────────────────────────────────────────────────────

function classifyIntent(keyword: string): "informational" | "navigational" | "transactional" | "commercial" {
  const lower = keyword.toLowerCase();
  if (/\b(kopen|bestellen|koop|bestel|aanvragen|offerte|prijs|kosten|abonnement|downloaden|inschrijven|huren|boeken|reserveren)\b/.test(lower))
    return "transactional";
  if (/\b(login|inloggen|aanmelden|mijn|account|contact|website|homepage|adres|vestiging)\b/.test(lower))
    return "navigational";
  if (/\b(wat|hoe|waarom|wanneer|wie|welke|uitleg|gids|tips|advies|leren|verschil|betekenis|definitie|voorbeeld|vergelijk|review|vs)\b/.test(lower))
    return "informational";
  return "commercial";
}

// ─── Keyword Clustering ───────────────────────────────────────────────────────

export function clusterKeywords(keywords: KeywordEntry[]): KeywordCluster[] {
  // Group keywords by their root word (stem)
  const groups: Map<string, KeywordEntry[]> = new Map();

  for (const kw of keywords) {
    const root = getRootWord(kw.keyword);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push({ ...kw, intent: classifyIntent(kw.keyword) });
  }

  // Convert groups to clusters, keeping only groups with 1+ keywords
  const clusters: KeywordCluster[] = [];

  for (const [root, kws] of Array.from(groups.entries())) {
    // Sort keywords by volume descending to find pillar keyword
    const sorted = [...kws].sort((a, b) => b.volume - a.volume);
    const pillar = sorted[0];
    const totalVolume = sorted.reduce((s, k) => s + k.volume, 0);
    const avgDifficulty = Math.round(sorted.reduce((s, k) => s + k.difficulty, 0) / sorted.length);

    // Determine dominant intent
    const intentCounts: Record<string, number> = {};
    for (const kw of sorted) {
      intentCounts[kw.intent] = (intentCounts[kw.intent] ?? 0) + 1;
    }
    const dominantIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0];

    clusters.push({
      name: titleCase(root + " cluster"),
      pillarKeyword: pillar.keyword,
      keywords: sorted.map((k) => ({ ...k, cluster: root })),
      totalVolume,
      avgDifficulty,
      intent: dominantIntent,
    });
  }

  // Sort by totalVolume descending
  return clusters.sort((a, b) => b.totalVolume - a.totalVolume);
}

// ─── Pillar Pages ─────────────────────────────────────────────────────────────

function buildPillarPages(clusters: KeywordCluster[]): PillarPage[] {
  // Take top clusters (max 6) as pillar pages
  return clusters.slice(0, 6).map((cluster) => {
    const clusterPages = cluster.keywords
      .slice(1, 8) // sub-keywords become cluster pages
      .map((kw) => ({
        title: titleCase(kw.keyword),
        slug: slugify(kw.keyword),
        keyword: kw.keyword,
      }));

    return {
      title: titleCase(cluster.pillarKeyword) + " — Compleet Overzicht",
      slug: slugify(cluster.pillarKeyword),
      pillarKeyword: cluster.pillarKeyword,
      clusterPages,
      totalVolume: cluster.totalVolume,
    };
  });
}

// ─── Content Ideas ────────────────────────────────────────────────────────────

interface ContentIdea {
  title: string;
  type: "pillar" | "cluster" | "blog" | "landing";
  keyword: string;
  intent: string;
  estimatedWords: number;
  priority: "high" | "medium" | "low";
}

function generateContentIdeas(keywords: KeywordEntry[], intake: Intake): ContentIdea[] {
  const ideas: ContentIdea[] = [];
  const companyName = intake.companyName;

  // Top 5 high-volume keywords get landing pages
  const highVolume = [...keywords].sort((a, b) => b.volume - a.volume).slice(0, 5);
  for (const kw of highVolume) {
    ideas.push({
      title: titleCase(kw.keyword) + " | " + companyName,
      type: "landing",
      keyword: kw.keyword,
      intent: classifyIntent(kw.keyword),
      estimatedWords: 1200,
      priority: "high",
    });
  }

  // Informational keywords become blog posts
  const informational = keywords.filter((k) => classifyIntent(k.keyword) === "informational").slice(0, 8);
  for (const kw of informational) {
    ideas.push({
      title: "Hoe werkt " + kw.keyword + "? Alles wat je moet weten",
      type: "blog",
      keyword: kw.keyword,
      intent: "informational",
      estimatedWords: 1800,
      priority: kw.volume > 1000 ? "high" : "medium",
    });
  }

  // Commercial keywords get service pages
  const commercial = keywords.filter((k) => classifyIntent(k.keyword) === "commercial").slice(0, 6);
  for (const kw of commercial) {
    ideas.push({
      title: titleCase(kw.keyword) + " — " + companyName,
      type: "cluster",
      keyword: kw.keyword,
      intent: "commercial",
      estimatedWords: 900,
      priority: kw.volume > 500 ? "high" : "medium",
    });
  }

  // Long-tail keywords become FAQ / comparison pages
  const longTail = keywords.filter((k) => k.category === "long-tail").slice(0, 5);
  for (const kw of longTail) {
    ideas.push({
      title: capitalize(kw.keyword) + ": Veelgestelde Vragen",
      type: "blog",
      keyword: kw.keyword,
      intent: "informational",
      estimatedWords: 600,
      priority: "low",
    });
  }

  return ideas;
}

// ─── Internal Link Structure ──────────────────────────────────────────────────

interface InternalLink {
  from: string;
  to: string;
  anchorText: string;
  type: "pillar-to-cluster" | "cluster-to-pillar" | "blog-to-landing" | "cross-cluster";
}

function buildInternalLinks(pillarPages: PillarPage[]): InternalLink[] {
  const links: InternalLink[] = [];

  for (const pillar of pillarPages) {
    // Pillar links to all cluster pages
    for (const cluster of pillar.clusterPages) {
      links.push({
        from: "/" + pillar.slug,
        to: "/" + cluster.slug,
        anchorText: cluster.keyword,
        type: "pillar-to-cluster",
      });
      // Cluster page links back to pillar
      links.push({
        from: "/" + cluster.slug,
        to: "/" + pillar.slug,
        anchorText: pillar.pillarKeyword,
        type: "cluster-to-pillar",
      });
    }
  }

  // Cross-cluster links between top pillars
  for (let i = 0; i < Math.min(pillarPages.length, 3); i++) {
    for (let j = i + 1; j < Math.min(pillarPages.length, 3); j++) {
      links.push({
        from: "/" + pillarPages[i].slug,
        to: "/" + pillarPages[j].slug,
        anchorText: pillarPages[j].pillarKeyword,
        type: "cross-cluster",
      });
    }
  }

  return links;
}

// ─── Metadata Recommendations ─────────────────────────────────────────────────

interface MetaRecommendation {
  page: string;
  keyword: string;
  titleTag: string;
  metaDescription: string;
  h1: string;
  urlSlug: string;
}

function generateMetadata(pillarPages: PillarPage[], intake: Intake): MetaRecommendation[] {
  const companyName = intake.companyName;
  const recommendations: MetaRecommendation[] = [];

  for (const pillar of pillarPages.slice(0, 8)) {
    const kw = pillar.pillarKeyword;
    recommendations.push({
      page: "/" + pillar.slug,
      keyword: kw,
      titleTag: `${titleCase(kw)} | ${companyName} — Expert in ${kw}`,
      metaDescription: `Ontdek alles over ${kw.toLowerCase()} bij ${companyName}. ✓ Professioneel advies ✓ Bewezen resultaten ✓ Gratis kennismakingsgesprek. Neem vandaag contact op!`,
      h1: titleCase(kw) + " — Wat Je Moet Weten",
      urlSlug: "/" + pillar.slug,
    });
  }

  return recommendations;
}

// ─── Priority Matrix ──────────────────────────────────────────────────────────

interface PriorityMatrixItem {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: string;
  priority: "quick-win" | "high-value" | "long-term" | "low-priority";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  recommendation: string;
}

function buildPriorityMatrix(keywords: KeywordEntry[]): PriorityMatrixItem[] {
  return keywords.slice(0, 20).map((kw) => {
    const isHighVolume = kw.volume > 2000;
    const isLowDifficulty = kw.difficulty < 45;
    const isHighCpc = kw.cpc > 3;

    let priority: PriorityMatrixItem["priority"];
    let effort: PriorityMatrixItem["effort"];
    let impact: PriorityMatrixItem["impact"];
    let recommendation: string;

    if (isLowDifficulty && isHighVolume) {
      priority = "quick-win";
      effort = "low";
      impact = "high";
      recommendation = "Maak direct een pagina — lage moeilijkheid, hoog volume";
    } else if (isHighVolume && kw.difficulty > 60) {
      priority = "high-value";
      effort = "high";
      impact = "high";
      recommendation = "Investeer in linkbuilding + autoriteit voor dit keyword";
    } else if (!isHighVolume && isLowDifficulty) {
      priority = "quick-win";
      effort = "low";
      impact = "medium";
      recommendation = "Eenvoudig te ranken — geschikt voor blog/FAQ pagina";
    } else if (kw.difficulty > 65) {
      priority = "long-term";
      effort = "high";
      impact = isHighVolume ? "high" : "medium";
      recommendation = "Plan voor 6-12 maanden: autoriteitsopbouw vereist";
    } else {
      priority = "low-priority";
      effort = "medium";
      impact = "low";
      recommendation = "Optimaliseer alleen als hogere prioriteiten zijn gedekt";
    }

    return {
      keyword: kw.keyword,
      volume: kw.volume,
      difficulty: kw.difficulty,
      cpc: kw.cpc,
      intent: classifyIntent(kw.keyword),
      priority,
      effort,
      impact,
      recommendation,
    };
  });
}

// ─── SEA: Campaign Architecture ──────────────────────────────────────────────

function buildCampaignArchitecture(
  clusters: KeywordCluster[],
  intake: Intake,
  totalBudget: number
): Campaign[] {
  const companyName = intake.companyName;
  const focusServices = parseJsonArray(intake.focusServices);
  const campaigns: Campaign[] = [];

  // Filter for commercial/transactional clusters only
  const commercialClusters = clusters.filter(
    (c) => c.intent === "commercial" || c.intent === "transactional"
  );
  const informationalClusters = clusters.filter((c) => c.intent === "informational");

  // Campaign 1: Brand Campaign (10% budget)
  const brandAdGroups: AdGroup[] = [
    {
      name: `${companyName} — Merknaam`,
      keywords: [
        { keyword: companyName.toLowerCase(), matchType: "Exact", volume: 500 },
        { keyword: `"${companyName.toLowerCase()}"`, matchType: "Phrase", volume: 300 },
      ],
      headlines: generateRsaHeadlines(companyName, companyName, "brand"),
      descriptions: generateRsaDescriptions(companyName, "brand"),
      landingPage: "/",
    },
  ];

  campaigns.push({
    name: `${companyName} — Brand`,
    type: "Search",
    objective: "Merknaam beschermen en directe bezoekers vangen",
    budget: Math.round(totalBudget * 0.1),
    budgetPercent: 10,
    adGroups: brandAdGroups,
  });

  // Campaign 2: Services (50% budget) — built from commercial clusters
  const serviceAdGroups: AdGroup[] = commercialClusters.slice(0, 5).map((cluster) => {
    const topKeywords = cluster.keywords.slice(0, 10);
    return {
      name: titleCase(cluster.pillarKeyword),
      keywords: topKeywords.map((kw) => ({
        keyword: kw.keyword,
        matchType: kw.category === "long-tail" ? "Exact" : "Phrase",
        volume: kw.volume,
      })),
      headlines: generateRsaHeadlines(companyName, cluster.pillarKeyword, "service"),
      descriptions: generateRsaDescriptions(companyName, "service"),
      landingPage: "/" + slugify(cluster.pillarKeyword),
    };
  });

  if (serviceAdGroups.length > 0) {
    campaigns.push({
      name: `${companyName} — Diensten`,
      type: "Search",
      objective: "Potentiële klanten aantrekken die actief zoeken naar diensten",
      budget: Math.round(totalBudget * 0.5),
      budgetPercent: 50,
      adGroups: serviceAdGroups,
    });
  }

  // Campaign 3: Competitor Campaign (20% budget)
  const competitors = parseJsonArray(intake.competitors).slice(0, 3);
  if (competitors.length > 0) {
    const competitorAdGroups: AdGroup[] = competitors.map((competitor) => ({
      name: `Concurrent — ${competitor}`,
      keywords: [
        { keyword: competitor.toLowerCase(), matchType: "Phrase", volume: 300 },
        { keyword: competitor.toLowerCase() + " alternatief", matchType: "Exact", volume: 100 },
      ],
      headlines: generateRsaHeadlines(companyName, competitor, "competitor"),
      descriptions: generateRsaDescriptions(companyName, "competitor"),
      landingPage: "/vergelijk",
    }));

    campaigns.push({
      name: `${companyName} — Concurrenten`,
      type: "Search",
      objective: "Concurrenten uitdagen en marktaandeel winnen",
      budget: Math.round(totalBudget * 0.2),
      budgetPercent: 20,
      adGroups: competitorAdGroups,
    });
  }

  // Campaign 4: Remarketing (20% budget)
  campaigns.push({
    name: `${companyName} — Remarketing`,
    type: "Display / RLSA",
    objective: "Eerdere bezoekers terugbrengen en leads heractiveren",
    budget: Math.round(totalBudget * 0.2),
    budgetPercent: 20,
    adGroups: [
      {
        name: "Website Bezoekers — Algemeen",
        keywords: [],
        headlines: generateRsaHeadlines(companyName, "remarketing", "remarketing"),
        descriptions: generateRsaDescriptions(companyName, "remarketing"),
        landingPage: "/aanbod",
      },
    ],
  });

  return campaigns;
}

// ─── RSA Ad Copy Generation ───────────────────────────────────────────────────

function generateRsaHeadlines(
  companyName: string,
  keyword: string,
  type: "brand" | "service" | "competitor" | "remarketing"
): string[] {
  const kw = titleCase(keyword);
  const cn = companyName;

  const headlines: Record<typeof type, string[]> = {
    brand: [
      cn,
      `Officiële Website ${cn}`,
      `${cn} — Uw Partner`,
      "Direct Contact Opnemen",
      "Gratis Kennismakingsgesprek",
      "Al 10+ Jaar Ervaring",
      "Tevreden Klanten Landelijk",
      "Vraag Nu een Offerte Aan",
      "Professioneel & Betrouwbaar",
      "Resultaatgericht Werken",
      "Bekijk Onze Cases",
      "Honderden Succesvolle Projecten",
      "Vandaag Starten",
      "Persoonlijk Advies",
      "100% Klanttevredenheid",
    ],
    service: [
      kw,
      `${kw} Door ${cn}`,
      `Professionele ${kw}`,
      `${kw} op Maat`,
      "Gratis Consult Aanvragen",
      "Resultaatgericht & Transparant",
      `Specialist in ${kw}`,
      "Bewezen Resultaten",
      "Offerte Binnen 24 uur",
      "Klanten Raten Ons ⭐⭐⭐⭐⭐",
      `${kw} voor MKB & Grootbedrijf`,
      "Geen Verborgen Kosten",
      "Direct Contact met Expert",
      "Strategie op Maat",
      "Start Vandaag Nog",
    ],
    competitor: [
      `Beter dan ${kw}?`,
      `${cn} vs ${kw} — Vergelijk`,
      `Overstappen van ${kw}`,
      "Bekijk Onze Voordelen",
      "Ontvang een Eerlijke Offerte",
      `${cn} — De Betere Keuze`,
      "Geen Contracten, Wel Resultaat",
      "Persoonlijker & Goedkoper",
      "Gratis Overstapadvies",
      "Direct Persoonlijk Contact",
      "Klanten Kiezen voor Kwaliteit",
      "Ervaring Telt",
      "Resultaten Spreken",
      "Probeer ${cn} Gratis",
      "Wij Overtreffen Verwachtingen",
    ],
    remarketing: [
      `Welkom Terug bij ${cn}`,
      "Nog Twijfels? Bel Ons",
      "Speciaal Aanbod voor U",
      "Uw Project Verdient het Beste",
      "Actie: Gratis Quickscan",
      `${cn} Herinnert Zich U`,
      "Klaar om te Starten?",
      "Beperkt Aanbod — Grijp Nu In",
      "Nog Één Stap Verwijderd",
      "Praat Vandaag met een Expert",
      "Wij Helpen U Verder",
      "Ontvang Nu uw Strategie",
      "Start met een Vrijblijvend Gesprek",
      "Zet de Volgende Stap",
      "Resultaten die U Wilt Zien",
    ],
  };

  return headlines[type];
}

function generateRsaDescriptions(companyName: string, type: string): string[] {
  const cn = companyName;
  const descriptions: Record<string, string[]> = {
    brand: [
      `${cn} helpt bedrijven groeien met bewezen online marketing strategieën. Vraag vandaag uw gratis adviesgesprek aan.`,
      `Meer dan 10 jaar ervaring in digitale marketing. ${cn} levert meetbare resultaten voor MKB en grootbedrijf.`,
      `Ontdek hoe ${cn} uw online aanwezigheid versterkt. Transparante aanpak, duidelijke rapportage, echte resultaten.`,
      `Van SEO tot Google Ads — ${cn} is uw complete online marketing partner. Plan nu een vrijblijvend gesprek.`,
    ],
    service: [
      `${cn} biedt professionele dienstverlening op maat. Geen standaardoplossingen — puur focus op uw doelen en resultaten.`,
      `Werkelijk meetbare resultaten dankzij onze bewezen aanpak. Laat ${cn} uw online groei versnellen. Gratis intake!`,
      `Transparante samenwerking, heldere rapportage en aantoonbare ROI. ${cn} ontzorgt u compleet. Bel vandaag nog.`,
      `Uw concurrenten zijn al actief online. Zorg dat u niet achterblijft — ${cn} helpt u de voorsprong te pakken.`,
    ],
    competitor: [
      `Overweegt u een alternatief? ${cn} biedt persoonlijker contact, snellere respons en aantoonbetere resultaten.`,
      `Vergelijk ons eerlijk: ${cn} levert meer voor minder. Vraag een vrijblijvende vergelijkende offerte aan.`,
      `Klanten die overstapten naar ${cn} rapporteren gemiddeld 35% betere prestaties. Bent u de volgende?`,
      `${cn} biedt geen one-size-fits-all. Wij maken het verschil met een aanpak die écht bij u past.`,
    ],
    remarketing: [
      `U was al op onze website — klaar voor de volgende stap? ${cn} staat klaar om u te helpen groeien.`,
      `Mis uw kans niet. ${cn} heeft nog capaciteit voor nieuwe klanten deze maand. Plan vandaag uw gesprek.`,
      `Uw concurrenten aarzelen niet. Zet vandaag de stap met ${cn} en start met een gratis strategie sessie.`,
      `Speciaal voor terugkerende bezoekers: gratis quickscan ter waarde van €295. Claim uw aanbod nu.`,
    ],
  };

  return descriptions[type] ?? descriptions["service"];
}

// ─── Negative Keywords ────────────────────────────────────────────────────────

function generateNegativeKeywords(intake: Intake): string[] {
  const negatives = [
    // Job seekers
    "vacature", "vacatures", "baan", "werk", "solliciteren", "cv", "stage", "stageplek",
    // Free stuff
    "gratis", "kosteloos", "free", "gratis download",
    // Education
    "cursus", "opleiding", "studie", "studeren", "leren", "tutorial", "handleiding", "boek",
    // DIY / self-service
    "zelf doen", "zelf maken", "template", "voorbeeld", "gratis template",
    // General unqualified
    "definitie", "betekenis", "wikipedia", "forum", "reddit",
    // Price signals (if premium brand)
    "goedkoop", "goedkoopste", "laagste prijs", "budget", "spotgoedkoop",
  ];

  // B2C brand: add B2B negatives
  const businessModel = intake.businessModel ?? "";
  if (businessModel === "B2B") {
    negatives.push("particulier", "thuis", "hobby", "persoonlijk gebruik");
  } else if (businessModel === "B2C") {
    negatives.push("bedrijven", "zakelijk", "groothandel", "b2b", "onderneming");
  }

  return negatives;
}

// ─── Budget Allocation ────────────────────────────────────────────────────────

interface BudgetAllocation {
  campaign: string;
  budget: number;
  percentage: number;
  rationale: string;
}

function buildBudgetAllocation(campaigns: Campaign[], totalBudget: number): BudgetAllocation[] {
  return campaigns.map((campaign) => ({
    campaign: campaign.name,
    budget: campaign.budget,
    percentage: campaign.budgetPercent,
    rationale: getBudgetRationale(campaign.type, campaign.budgetPercent),
  }));
}

function getBudgetRationale(type: string, pct: number): string {
  if (type === "Search" && pct >= 40) return "Primaire bron van conversies — hoog budget gerechtvaardigd door directe ROI";
  if (type === "Search" && pct <= 15) return "Merkcampagne beschermt branded verkeer tegen concurrenten";
  if (type === "Display / RLSA") return "Remarketing converteert warme bezoekers tegen lagere CPA dan prospecting";
  if (pct >= 20) return "Concurrentencampagne pikt marktaandeel op bij merkbewuste zoekers";
  return "Aanvullende campagne ter ondersteuning van hoofdstrategie";
}

// ─── Landing Page Recommendations ────────────────────────────────────────────

interface LandingPageRecommendation {
  url: string;
  campaign: string;
  headline: string;
  cta: string;
  conversionGoal: string;
  elements: string[];
}

function buildLandingPageRecommendations(campaigns: Campaign[], intake: Intake): LandingPageRecommendation[] {
  const conversionType = intake.conversionType ?? "lead";
  const companyName = intake.companyName;

  const ctaMap: Record<string, string> = {
    lead: "Vraag Gratis Advies Aan",
    sale: "Koop Nu",
    appointment: "Plan een Afspraak",
    download: "Download Gratis",
    signup: "Meld Je Aan",
    contact: "Neem Contact Op",
  };
  const cta = ctaMap[conversionType] ?? "Neem Contact Op";

  const pages: LandingPageRecommendation[] = [];

  for (const campaign of campaigns.slice(0, 4)) {
    const firstAg = campaign.adGroups[0];
    if (!firstAg) continue;
    pages.push({
      url: firstAg.landingPage,
      campaign: campaign.name,
      headline: firstAg.headlines[0] ?? companyName,
      cta,
      conversionGoal: conversionType,
      elements: [
        "Hero sectie met duidelijke waardepropositie en CTA boven de vouw",
        "Sociale bewijskracht: klantreviews, logo's, beoordelingscijfer",
        "Korte lijst van 3-5 kernvoordelen met iconen",
        "Formulier of belknop prominent zichtbaar",
        "Trustsymbolen: veilig betalen, certificeringen, KvK-nummer",
        "FAQ sectie gericht op bezwaren van de doelgroep",
        "Exit-intent pop-up met lead magnet of kortingsaanbod",
      ],
    });
  }

  return pages;
}

// ─── Bid Strategy ─────────────────────────────────────────────────────────────

interface BidStrategy {
  campaign: string;
  strategy: string;
  targetCpa?: number;
  targetRoas?: number;
  rationale: string;
  phaseIn: string;
}

function buildBidStrategy(campaigns: Campaign[], intake: Intake): BidStrategy[] {
  const conversionType = intake.conversionType ?? "lead";

  return campaigns.map((campaign) => {
    if (campaign.name.includes("Brand")) {
      return {
        campaign: campaign.name,
        strategy: "Target Impression Share",
        rationale: "Garandeert zichtbaarheid op merknaam — voorkomt dat concurrenten uw merk kapen",
        phaseIn: "Direct instellen vanaf dag 1",
      };
    } else if (campaign.name.includes("Remarketing") || campaign.type.includes("Display")) {
      return {
        campaign: campaign.name,
        strategy: "Maximize Conversions",
        rationale: "Remarketing publiek is warm — geautomatiseerde biedingen optimaliseren voor conversie",
        phaseIn: "Handmatig CPC eerste 2 weken, dan overschakelen naar Maximize Conversions",
      };
    } else {
      return {
        campaign: campaign.name,
        strategy: "Target CPA (na data-inzameling)",
        targetCpa: 75,
        rationale: "Eerst handmatig CPC voor dataopbouw, daarna Target CPA voor efficiënte schaling",
        phaseIn: "Handmatig CPC eerste 30 dagen, Target CPA zodra 30+ conversies zijn geregistreerd",
      };
    }
  });
}

// ─── Executive Summary ────────────────────────────────────────────────────────

function generateExecutiveSummary(
  intake: Intake,
  keywords: KeywordEntry[],
  clusters: KeywordCluster[],
  campaigns: Campaign[]
): string {
  const companyName = intake.companyName;
  const totalVolume = keywords.reduce((s, k) => s + k.volume, 0);
  const avgDifficulty = Math.round(keywords.reduce((s, k) => s + k.difficulty, 0) / (keywords.length || 1));
  const transactionalKws = keywords.filter((k) => classifyIntent(k.keyword) === "transactional");
  const totalBudget = parseInt(intake.adBudget ?? "1000") || 1000;

  return `Op basis van de intakegesprek en ons dataonderzoek hebben wij een volledig digitale marketingstrategie uitgewerkt voor ${companyName}. Deze strategie omvat zowel organische zoekmachineoptimalisatie (SEO) als betaalde zoekmachine advertenties (SEA) om optimale zichtbaarheid en groei te realiseren.

Wij hebben ${keywords.length} relevante zoekwoorden geïdentificeerd met een gecombineerd maandelijks zoekvolume van ${totalVolume.toLocaleString("nl-NL")} zoekopdrachten. De gemiddelde zoekmoeilijkheid is ${avgDifficulty}/100, wat duidt op ${avgDifficulty < 45 ? "realistische kansen voor nieuwe content" : avgDifficulty < 65 ? "een competitieve markt met serieuze investeringsbehoefte" : "een sterk competitieve markt waar autoriteitsopbouw cruciaal is"}. De zoekwoorden zijn gegroepeerd in ${clusters.length} thematische clusters, elk met een aangewezen pillar page als hoofdpagina en cluster pages voor diepgaande onderwerpdekkig.

Met een maandelijks budget van €${totalBudget.toLocaleString("nl-NL")} adviseren wij ${campaigns.length} campagnes te lanceren: een merkbeschermingscampagne, een servicegerichte campagne, en een remarketing campagne. De focus ligt op de ${transactionalKws.length} transactionele zoekwoorden met de hoogste commerciële intentie.

Bij correcte implementatie verwachten wij binnen 3-6 maanden een significante toename in organisch verkeer en een meetbare ROI op de SEA investeringen. De uitgebreide implementatielijst en prioriteitenmatrix in dit rapport begeleiden uw team stap voor stap.`;
}

// ─── Key Findings ─────────────────────────────────────────────────────────────

function generateKeyFindings(
  keywords: KeywordEntry[],
  clusters: KeywordCluster[],
  intake: Intake
): string[] {
  const findings: string[] = [];

  const highVolumeKws = keywords.filter((k) => k.volume > 2000);
  const quickWins = keywords.filter((k) => k.volume > 500 && k.difficulty < 40);
  const transactional = keywords.filter((k) => classifyIntent(k.keyword) === "transactional");
  const avgCpc = keywords.reduce((s, k) => s + k.cpc, 0) / (keywords.length || 1);

  findings.push(`${keywords.length} zoekwoorden geïdentificeerd met totaal ${keywords.reduce((s, k) => s + k.volume, 0).toLocaleString("nl-NL")} maandelijkse zoekopdrachten in ${intake.country ?? "Nederland"}.`);

  if (highVolumeKws.length > 0) {
    findings.push(`${highVolumeKws.length} zoekwoorden met hoog volume (>2.000/maand), waaronder "${highVolumeKws[0].keyword}" met ${highVolumeKws[0].volume.toLocaleString("nl-NL")} zoekopdrachten.`);
  }

  if (quickWins.length > 0) {
    findings.push(`${quickWins.length} "quick win" zoekwoorden gevonden — goede volumes met lage moeilijkheidsgraad (<40). Direct actie aanbevolen.`);
  }

  if (transactional.length > 0) {
    findings.push(`${transactional.length} zoekwoorden met transactionele intentie — direct klaar voor SEA campagnes en conversiegericht content.`);
  }

  findings.push(`Gemiddelde CPC van €${avgCpc.toFixed(2)} — ${avgCpc > 5 ? "competitieve markt, focus op kwaliteitsscore ter verlaging van kosten" : "relatief gunstige markt voor betaald adverteren"}.`);

  findings.push(`${clusters.length} thematische clusters geïdentificeerd. Sterkste cluster: "${clusters[0]?.name ?? "onbekend"}" met ${(clusters[0]?.totalVolume ?? 0).toLocaleString("nl-NL")} totaal volume.`);

  const competitors = parseJsonArray(intake.competitors);
  if (competitors.length > 0) {
    findings.push(`${competitors.length} concurrenten geanalyseerd: ${competitors.slice(0, 3).join(", ")}. Concurrenten campagnes aanbevolen om marktaandeel te veroveren.`);
  }

  return findings;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

function generateRecommendations(
  keywords: KeywordEntry[],
  clusters: KeywordCluster[],
  pillarPages: PillarPage[],
  intake: Intake
): string[] {
  return [
    `Prioriteer de ${Math.min(pillarPages.length, 3)} pillar pages als eerste content-investering — zij vormen de basis van de organische structuur.`,
    "Implementeer technische SEO basics: sitemap.xml, robots.txt, gestructureerde data (Schema.org), Core Web Vitals optimalisatie.",
    `Start Google Ads campagnes gericht op de ${keywords.filter((k) => classifyIntent(k.keyword) === "transactional").length} transactionele zoekwoorden voor directe ROI.`,
    "Bouw maandelijks 3-5 backlinks van relevante Nederlandse bronnen: brancheverenigingen, regionale media, partner websites.",
    "Stel Google Search Console en Google Analytics 4 in (of controleer bestaande implementatie) voor continue performance monitoring.",
    "Maak van elke pillar page een 1.500+ woorden uitgebreide resource — diepgang scoort beter dan dunne content.",
    `Targeteer eerst de ${keywords.filter((k) => k.difficulty < 45 && k.volume > 300).length} low-difficulty zoekwoorden voor snelle rankings en autoriteitsopbouw.`,
    "Optimaliseer Google Bedrijfsprofiel voor lokale zichtbaarheid — cruciaal voor service-georiënteerde bedrijven.",
    "Voer kwartaallijks een SEO audit uit om technische problemen, nieuwe kansen en concurrentieontwikkelingen te monitoren.",
    "A/B test landingspagina's voor SEA campagnes om de conversieratio te optimaliseren vóór budget te verhogen.",
  ];
}

// ─── Implementation Checklist ─────────────────────────────────────────────────

function generateImplementationChecklist(intake: Intake): ChecklistItem[] {
  return [
    // Technical SEO
    { task: "Google Search Console instellen en verificeren", category: "Technische SEO", priority: "high", status: "pending" },
    { task: "Google Analytics 4 implementeren met conversie tracking", category: "Technische SEO", priority: "high", status: "pending" },
    { task: "XML Sitemap aanmaken en indienen bij Google", category: "Technische SEO", priority: "high", status: "pending" },
    { task: "Robots.txt controleren en optimaliseren", category: "Technische SEO", priority: "medium", status: "pending" },
    { task: "Core Web Vitals optimaliseren (LCP < 2.5s, CLS < 0.1, FID < 100ms)", category: "Technische SEO", priority: "high", status: "pending" },
    { task: "HTTPS/SSL certificaat controleren", category: "Technische SEO", priority: "high", status: "pending" },
    { task: "Canonical tags implementeren op dubbele content", category: "Technische SEO", priority: "medium", status: "pending" },
    { task: "Schema.org gestructureerde data toevoegen (Organization, LocalBusiness)", category: "Technische SEO", priority: "medium", status: "pending" },
    // On-page SEO
    { task: "Pillar pages schrijven (min. 1.500 woorden per pagina)", category: "On-page SEO", priority: "high", status: "pending" },
    { task: "Meta titles en descriptions optimaliseren voor alle pagina's", category: "On-page SEO", priority: "high", status: "pending" },
    { task: "H1-H3 structuur controleren en keywords verwerken", category: "On-page SEO", priority: "high", status: "pending" },
    { task: "Interne linkstructuur implementeren conform pillar-cluster model", category: "On-page SEO", priority: "medium", status: "pending" },
    { task: "Afbeeldingen optimaliseren: alt-teksten, WebP formaat, lazy loading", category: "On-page SEO", priority: "medium", status: "pending" },
    // Off-page SEO
    { task: "Google Bedrijfsprofiel aanmaken/optimaliseren", category: "Off-page SEO", priority: "high", status: "pending" },
    { task: "Eerste 5 backlinks verwerven van Nederlandse branchebronnen", category: "Off-page SEO", priority: "medium", status: "pending" },
    { task: "Vermeldingen in online directories (KvK, Trustpilot, branchegids)", category: "Off-page SEO", priority: "medium", status: "pending" },
    // SEA
    { task: "Google Ads account aanmaken/controleren en conversion tracking instellen", category: "SEA", priority: "high", status: "pending" },
    { task: "Merkbeschermingscampagne live zetten", category: "SEA", priority: "high", status: "pending" },
    { task: "Diensten campagne opzetten met RSA advertenties", category: "SEA", priority: "high", status: "pending" },
    { task: "Negatieve zoekwoorden lijst implementeren", category: "SEA", priority: "high", status: "pending" },
    { task: "Advertentie extensies toevoegen: sitelinks, callouts, gestructureerde fragmenten", category: "SEA", priority: "medium", status: "pending" },
    { task: "Remarketing publiek instellen via Google Ads tag of GA4", category: "SEA", priority: "medium", status: "pending" },
    { task: "Wekelijkse performance review inplannen eerste 3 maanden", category: "SEA", priority: "medium", status: "pending" },
    // Reporting
    { task: "Maandelijkse rapportage dashboard opzetten in Looker Studio", category: "Rapportage", priority: "medium", status: "pending" },
    { task: "KPI targets vastleggen en baseline meting uitvoeren", category: "Rapportage", priority: "high", status: "pending" },
  ];
}

// ─── Performance Estimates ────────────────────────────────────────────────────

interface PerformanceEstimate {
  metric: string;
  current: string;
  month3: string;
  month6: string;
  month12: string;
  confidence: "hoog" | "gemiddeld" | "laag";
}

function generatePerformanceEstimates(
  keywords: KeywordEntry[],
  intake: Intake
): PerformanceEstimate[] {
  const totalVolume = keywords.reduce((s, k) => s + k.volume, 0);
  const budget = parseInt(intake.adBudget ?? "1000") || 1000;
  const avgCpc = keywords.reduce((s, k) => s + k.cpc, 0) / (keywords.length || 1);
  const monthlyClicks = Math.round(budget / Math.max(avgCpc, 0.5));

  return [
    {
      metric: "Organisch maandelijks verkeer",
      current: "Onbekend (baseline meting vereist)",
      month3: `+${Math.round(totalVolume * 0.005).toLocaleString("nl-NL")} bezoekers/maand`,
      month6: `+${Math.round(totalVolume * 0.02).toLocaleString("nl-NL")} bezoekers/maand`,
      month12: `+${Math.round(totalVolume * 0.06).toLocaleString("nl-NL")} bezoekers/maand`,
      confidence: "gemiddeld",
    },
    {
      metric: "Google Ads clicks (maandelijks)",
      current: "0",
      month3: `${Math.round(monthlyClicks * 0.8).toLocaleString("nl-NL")} clicks`,
      month6: `${monthlyClicks.toLocaleString("nl-NL")} clicks`,
      month12: `${Math.round(monthlyClicks * 1.2).toLocaleString("nl-NL")} clicks`,
      confidence: "hoog",
    },
    {
      metric: "Conversies via SEA (maandelijks)",
      current: "0",
      month3: `${Math.round(monthlyClicks * 0.03)} leads`,
      month6: `${Math.round(monthlyClicks * 0.04)} leads`,
      month12: `${Math.round(monthlyClicks * 0.05)} leads`,
      confidence: "gemiddeld",
    },
    {
      metric: "Aantal gerankte zoekwoorden (top 10)",
      current: "Onbekend",
      month3: `5-15 zoekwoorden`,
      month6: `20-40 zoekwoorden`,
      month12: `50-80 zoekwoorden`,
      confidence: "gemiddeld",
    },
    {
      metric: "Geschatte CPA (Cost Per Acquisition)",
      current: "Onbekend",
      month3: `€${Math.round(budget / Math.max(monthlyClicks * 0.03, 1))} per lead`,
      month6: `€${Math.round(budget * 0.9 / Math.max(monthlyClicks * 0.04, 1))} per lead`,
      month12: `€${Math.round(budget * 0.8 / Math.max(monthlyClicks * 0.05, 1))} per lead`,
      confidence: "laag",
    },
    {
      metric: "Domain Authority groei",
      current: "Laag (nieuw/onbekend)",
      month3: "Lichte stijging verwacht",
      month6: "+5-10 DA punten",
      month12: "+15-25 DA punten",
      confidence: "laag",
    },
  ];
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export interface GeneratedStrategy {
  seo: InsertSeo;
  sea: InsertSea;
  summary: InsertStrategySummary;
}

export function generateStrategy(intake: Intake, keywords: KeywordEntry[]): GeneratedStrategy {
  // Classify intent for all keywords
  const classifiedKeywords = keywords.map((kw) => ({
    ...kw,
    intent: classifyIntent(kw.keyword),
  }));

  // SEO outputs
  const clusters = clusterKeywords(classifiedKeywords);
  const pillarPages = buildPillarPages(clusters);
  const contentIdeas = generateContentIdeas(classifiedKeywords, intake);
  const internalLinks = buildInternalLinks(pillarPages);
  const metadata = generateMetadata(pillarPages, intake);
  const priorityMatrix = buildPriorityMatrix(classifiedKeywords);

  // SEA outputs
  const totalBudget = parseInt(intake.adBudget ?? "1000") || 1000;
  const campaigns = buildCampaignArchitecture(clusters, intake, totalBudget);
  const allAdGroups = campaigns.flatMap((c) => c.adGroups);
  const negativeKeywords = generateNegativeKeywords(intake);
  const adCopy = {
    campaigns: campaigns.map((c) => ({
      name: c.name,
      adGroups: c.adGroups.map((ag) => ({
        name: ag.name,
        headlines: ag.headlines,
        descriptions: ag.descriptions,
      })),
    })),
  };
  const budgetAllocation = buildBudgetAllocation(campaigns, totalBudget);
  const landingPages = buildLandingPageRecommendations(campaigns, intake);
  const bidStrategy = buildBidStrategy(campaigns, intake);

  // Summary outputs
  const executiveSummary = generateExecutiveSummary(intake, classifiedKeywords, clusters, campaigns);
  const keyFindings = generateKeyFindings(classifiedKeywords, clusters, intake);
  const recommendations = generateRecommendations(classifiedKeywords, clusters, pillarPages, intake);
  const implementationChecklist = generateImplementationChecklist(intake);
  const performanceEstimates = generatePerformanceEstimates(classifiedKeywords, intake);

  return {
    seo: {
      projectId: intake.projectId,
      keywords: JSON.stringify(classifiedKeywords),
      clusters: JSON.stringify(clusters),
      pillarPages: JSON.stringify(pillarPages),
      contentIdeas: JSON.stringify(contentIdeas),
      internalLinks: JSON.stringify(internalLinks),
      metadata: JSON.stringify(metadata),
      priorityMatrix: JSON.stringify(priorityMatrix),
    },
    sea: {
      projectId: intake.projectId,
      campaigns: JSON.stringify(campaigns),
      adGroups: JSON.stringify(allAdGroups),
      negativeKeywords: JSON.stringify(negativeKeywords),
      adCopy: JSON.stringify(adCopy),
      budgetAllocation: JSON.stringify(budgetAllocation),
      landingPages: JSON.stringify(landingPages),
      bidStrategy: JSON.stringify(bidStrategy),
    },
    summary: {
      projectId: intake.projectId,
      executiveSummary,
      keyFindings: JSON.stringify(keyFindings),
      recommendations: JSON.stringify(recommendations),
      implementationChecklist: JSON.stringify(implementationChecklist),
      performanceEstimates: JSON.stringify(performanceEstimates),
    },
  };
}
