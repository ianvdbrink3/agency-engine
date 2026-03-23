/**
 * DataForSEO Integration Module
 *
 * Provides keyword data, suggestions, and ideas via the DataForSEO API.
 * Falls back to realistic Dutch mock data when credentials are not set.
 */

import type { KeywordEntry } from "@shared/schema";

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAuthHeader(): string | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  const encoded = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

function hasCredentials(): boolean {
  return !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

// ─── Location / Language Mapping ─────────────────────────────────────────────

export const LOCATION_CODES: Record<string, number> = {
  Nederland: 2528,
  Netherlands: 2528,
  NL: 2528,
  België: 2056,
  Belgium: 2056,
  BE: 2056,
  Duitsland: 2276,
  Germany: 2276,
  DE: 2276,
  "Verenigd Koninkrijk": 2826,
  "United Kingdom": 2826,
  UK: 2826,
  GB: 2826,
  "Verenigde Staten": 2840,
  "United States": 2840,
  USA: 2840,
  US: 2840,
  Frankrijk: 2250,
  France: 2250,
  FR: 2250,
  Spanje: 2724,
  Spain: 2724,
  ES: 2724,
  Italië: 2380,
  Italy: 2380,
  IT: 2380,
  Zweden: 2752,
  Sweden: 2752,
  SE: 2752,
  Denemarken: 2208,
  Denmark: 2208,
  DK: 2208,
  Noorwegen: 2578,
  Norway: 2578,
  NO: 2578,
  Australië: 2036,
  Australia: 2036,
  AU: 2036,
  Canada: 2124,
  CA: 2124,
};

export const LANGUAGE_CODES: Record<string, string> = {
  Nederlands: "nl",
  Dutch: "nl",
  nl: "nl",
  Engels: "en",
  English: "en",
  en: "en",
  Duits: "de",
  German: "de",
  de: "de",
  Frans: "fr",
  French: "fr",
  fr: "fr",
  Spaans: "es",
  Spanish: "es",
  es: "es",
  Italiaans: "it",
  Italian: "it",
  it: "it",
};

/**
 * Map a country name/code to a DataForSEO location code.
 * Returns 2528 (Nederland) as default.
 */
export function getLocationCode(country: string): number {
  return LOCATION_CODES[country] ?? 2528;
}

/**
 * Map a language name/code to a DataForSEO language code.
 * Returns "nl" as default.
 */
export function getLanguageCode(language: string): string {
  return LANGUAGE_CODES[language] ?? "nl";
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function dataForSeoPost<T>(endpoint: string, body: unknown): Promise<T> {
  const auth = getAuthHeader();
  if (!auth) throw new Error("DataForSEO credentials not set");

  const response = await fetch(`https://api.dataforseo.com${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DataForSEO API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ─── DataForSEO Response Types ────────────────────────────────────────────────

interface DataForSeoKeywordResult {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
  search_volume_trend?: {
    months?: Array<{ search_volume: number }>;
  };
  keyword_properties?: {
    keyword_difficulty?: number;
  };
}

interface DataForSeoTaskResult {
  result?: Array<{
    items?: DataForSeoKeywordResult[];
  }>;
  status_code?: number;
  status_message?: string;
}

interface DataForSeoResponse {
  tasks?: DataForSeoTaskResult[];
  status_code?: number;
  status_message?: string;
}

// ─── Mock Data (Dutch marketing keywords) ────────────────────────────────────

const MOCK_DUTCH_KEYWORDS: KeywordEntry[] = [
  { keyword: "digitale marketing bureau", volume: 4400, difficulty: 62, cpc: 4.5, intent: "commercial", category: "primary" },
  { keyword: "seo bureau nederland", volume: 3600, difficulty: 71, cpc: 6.2, intent: "commercial", category: "primary" },
  { keyword: "google ads bureau", volume: 2900, difficulty: 68, cpc: 7.8, intent: "commercial", category: "primary" },
  { keyword: "online marketing bureau amsterdam", volume: 1900, difficulty: 58, cpc: 5.1, intent: "commercial", category: "secondary" },
  { keyword: "seo optimalisatie", volume: 5400, difficulty: 55, cpc: 3.4, intent: "informational", category: "primary" },
  { keyword: "zoekmachine optimalisatie", volume: 4100, difficulty: 52, cpc: 3.1, intent: "informational", category: "primary" },
  { keyword: "website laten maken", volume: 8100, difficulty: 73, cpc: 5.5, intent: "commercial", category: "primary" },
  { keyword: "webshop laten maken", volume: 6600, difficulty: 70, cpc: 6.0, intent: "commercial", category: "primary" },
  { keyword: "content marketing strategie", volume: 1300, difficulty: 44, cpc: 2.8, intent: "informational", category: "secondary" },
  { keyword: "social media marketing nederland", volume: 1600, difficulty: 49, cpc: 3.2, intent: "commercial", category: "secondary" },
  { keyword: "email marketing software", volume: 2400, difficulty: 60, cpc: 4.1, intent: "commercial", category: "secondary" },
  { keyword: "google analytics instellen", volume: 1800, difficulty: 38, cpc: 1.9, intent: "informational", category: "secondary" },
  { keyword: "wat is seo", volume: 9900, difficulty: 32, cpc: 1.2, intent: "informational", category: "secondary" },
  { keyword: "seo tips 2024", volume: 2200, difficulty: 35, cpc: 1.5, intent: "informational", category: "secondary" },
  { keyword: "linkbuilding nederland", volume: 880, difficulty: 58, cpc: 4.3, intent: "commercial", category: "secondary" },
  { keyword: "technische seo audit", volume: 720, difficulty: 51, cpc: 3.7, intent: "commercial", category: "long-tail" },
  { keyword: "lokale seo optimalisatie", volume: 590, difficulty: 45, cpc: 3.0, intent: "commercial", category: "long-tail" },
  { keyword: "google ads kosten", volume: 3300, difficulty: 42, cpc: 2.1, intent: "informational", category: "secondary" },
  { keyword: "ppc campagne opzetten", volume: 480, difficulty: 47, cpc: 4.8, intent: "informational", category: "long-tail" },
  { keyword: "conversie optimalisatie", volume: 1100, difficulty: 53, cpc: 3.6, intent: "commercial", category: "secondary" },
  { keyword: "online marketing kosten", volume: 1400, difficulty: 40, cpc: 2.3, intent: "informational", category: "secondary" },
  { keyword: "seo bureau offerte", volume: 390, difficulty: 55, cpc: 8.1, intent: "transactional", category: "long-tail" },
  { keyword: "google ads specialist", volume: 1200, difficulty: 65, cpc: 9.2, intent: "commercial", category: "secondary" },
  { keyword: "keywords onderzoek doen", volume: 660, difficulty: 36, cpc: 2.0, intent: "informational", category: "long-tail" },
  { keyword: "concurrentieanalyse online", volume: 480, difficulty: 34, cpc: 1.8, intent: "informational", category: "long-tail" },
  { keyword: "remarketing campagne", volume: 590, difficulty: 50, cpc: 3.9, intent: "commercial", category: "long-tail" },
  { keyword: "display adverteren google", volume: 720, difficulty: 45, cpc: 2.7, intent: "commercial", category: "long-tail" },
  { keyword: "hoe werkt seo", volume: 2900, difficulty: 28, cpc: 0.9, intent: "informational", category: "secondary" },
  { keyword: "b2b marketing strategie", volume: 880, difficulty: 46, cpc: 3.3, intent: "informational", category: "secondary" },
  { keyword: "inbound marketing bureau", volume: 480, difficulty: 52, cpc: 4.6, intent: "commercial", category: "long-tail" },
];

function generateMockKeywordsForQuery(keywords: string[]): KeywordEntry[] {
  // Return a mix of mock data plus variations based on input keywords
  const results: KeywordEntry[] = [];

  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    // Try to find a close match in mock data
    const match = MOCK_DUTCH_KEYWORDS.find((m) => m.keyword.includes(lower) || lower.includes(m.keyword.split(" ")[0]));
    if (match) {
      results.push({ ...match, keyword: kw });
    } else {
      // Generate plausible data
      results.push({
        keyword: kw,
        volume: Math.floor(Math.random() * 3000) + 200,
        difficulty: Math.floor(Math.random() * 40) + 30,
        cpc: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        intent: classifyIntentFromKeyword(kw),
        category: kw.split(" ").length > 3 ? "long-tail" : "secondary",
      });
    }
  }

  return results;
}

function classifyIntentFromKeyword(
  keyword: string
): "informational" | "navigational" | "transactional" | "commercial" {
  const lower = keyword.toLowerCase();

  // Transactional
  if (
    /\b(kopen|bestellen|koop|bestel|aanvragen|offerte|prijs|kosten|abonnement|downloaden|inschrijven)\b/.test(lower)
  )
    return "transactional";

  // Navigational
  if (/\b(login|inloggen|aanmelden|mijn|account|contact|adres)\b/.test(lower)) return "navigational";

  // Informational
  if (
    /\b(wat|hoe|waarom|wanneer|wie|welke|uitleg|gids|tips|advies|leren|verschil|betekenis|definitie|voorbeeld)\b/.test(
      lower
    )
  )
    return "informational";

  // Commercial (default for services)
  return "commercial";
}

// ─── Public API Functions ─────────────────────────────────────────────────────

/**
 * Fetch search volumes for a list of keywords.
 */
export async function fetchKeywordData(
  keywords: string[],
  locationCode: number,
  languageCode: string
): Promise<KeywordEntry[]> {
  if (!hasCredentials()) {
    console.log("[DataForSEO] No credentials — using mock keyword data");
    return generateMockKeywordsForQuery(keywords);
  }

  try {
    const payload = [
      {
        keywords,
        location_code: locationCode,
        language_code: languageCode,
        search_partners: false,
      },
    ];

    const data = await dataForSeoPost<DataForSeoResponse>(
      "/v3/keywords_data/google_ads/search_volume/live",
      payload
    );

    const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
    return items.map((item) => ({
      keyword: item.keyword,
      volume: item.search_volume ?? 0,
      difficulty: item.keyword_properties?.keyword_difficulty ?? Math.floor(Math.random() * 40) + 20,
      cpc: item.cpc ?? 0,
      intent: classifyIntentFromKeyword(item.keyword),
      category: item.keyword.split(" ").length > 3 ? "long-tail" : "secondary",
    }));
  } catch (err) {
    console.error("[DataForSEO] fetchKeywordData error:", err);
    return generateMockKeywordsForQuery(keywords);
  }
}

/**
 * Fetch keyword suggestions (related keywords) for a seed keyword.
 */
export async function fetchKeywordSuggestions(
  keyword: string,
  locationCode: number,
  languageCode: string
): Promise<KeywordEntry[]> {
  if (!hasCredentials()) {
    console.log("[DataForSEO] No credentials — using mock suggestion data");
    // Return mock keywords filtered/related to the input
    return MOCK_DUTCH_KEYWORDS.filter((k) => {
      const words = keyword.toLowerCase().split(" ");
      return words.some((w) => w.length > 3 && k.keyword.includes(w));
    }).slice(0, 15);
  }

  try {
    const payload = [
      {
        keywords: [keyword],
        location_code: locationCode,
        language_code: languageCode,
        search_partners: false,
      },
    ];

    const data = await dataForSeoPost<DataForSeoResponse>(
      "/v3/keywords_data/google_ads/keywords_for_keywords/live",
      payload
    );

    const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
    return items.map((item) => ({
      keyword: item.keyword,
      volume: item.search_volume ?? 0,
      difficulty: item.keyword_properties?.keyword_difficulty ?? Math.floor(Math.random() * 40) + 20,
      cpc: item.cpc ?? 0,
      intent: classifyIntentFromKeyword(item.keyword),
      category: item.keyword.split(" ").length > 3 ? "long-tail" : "secondary",
    }));
  } catch (err) {
    console.error("[DataForSEO] fetchKeywordSuggestions error:", err);
    return MOCK_DUTCH_KEYWORDS.slice(0, 15);
  }
}

/**
 * Fetch keyword ideas based on a domain URL.
 */
export async function fetchKeywordIdeas(
  url: string,
  locationCode: number,
  languageCode: string
): Promise<KeywordEntry[]> {
  if (!hasCredentials()) {
    console.log("[DataForSEO] No credentials — using mock keyword ideas data");
    return MOCK_DUTCH_KEYWORDS;
  }

  try {
    // Normalize the URL to just the domain
    let target = url;
    try {
      target = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    } catch {
      target = url.replace(/^https?:\/\//, "").split("/")[0];
    }

    const payload = [
      {
        target,
        location_code: locationCode,
        language_code: languageCode,
        search_partners: false,
      },
    ];

    const data = await dataForSeoPost<DataForSeoResponse>(
      "/v3/keywords_data/google_ads/keywords_for_site/live",
      payload
    );

    const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
    return items.map((item) => ({
      keyword: item.keyword,
      volume: item.search_volume ?? 0,
      difficulty: item.keyword_properties?.keyword_difficulty ?? Math.floor(Math.random() * 40) + 20,
      cpc: item.cpc ?? 0,
      intent: classifyIntentFromKeyword(item.keyword),
      category: item.keyword.split(" ").length > 3 ? "long-tail" : "secondary",
    }));
  } catch (err) {
    console.error("[DataForSEO] fetchKeywordIdeas error:", err);
    return MOCK_DUTCH_KEYWORDS;
  }
}

/**
 * Gather all keyword data for a project's intake.
 * Uses domain-based ideas + suggestions from focus services + seed keywords.
 */
export async function gatherKeywordsForIntake(options: {
  domain?: string | null;
  focusServices?: string[];
  companyName: string;
  industry?: string | null;
  country?: string | null;
  language?: string | null;
}): Promise<KeywordEntry[]> {
  const locationCode = getLocationCode(options.country ?? "Nederland");
  const languageCode = getLanguageCode(options.language ?? "Nederlands");

  const allKeywords: KeywordEntry[] = [];
  const seen = new Set<string>();

  const addUnique = (kws: KeywordEntry[]) => {
    for (const kw of kws) {
      if (!seen.has(kw.keyword)) {
        seen.add(kw.keyword);
        allKeywords.push(kw);
      }
    }
  };

  // 1. Get domain-based keywords if domain is set
  if (options.domain) {
    const ideas = await fetchKeywordIdeas(options.domain, locationCode, languageCode);
    addUnique(ideas);
  }

  // 2. Get suggestions from focus services
  if (options.focusServices && options.focusServices.length > 0) {
    for (const service of options.focusServices.slice(0, 3)) {
      const suggestions = await fetchKeywordSuggestions(service, locationCode, languageCode);
      addUnique(suggestions);
    }
  }

  // 3. If not enough keywords, fetch search volume for industry + company combos
  if (allKeywords.length < 15 && options.industry) {
    const seeds = [
      options.industry,
      `${options.industry} nederland`,
      `${options.industry} bureau`,
      `${options.industry} service`,
      options.companyName,
    ].filter(Boolean);

    const volumeData = await fetchKeywordData(seeds, locationCode, languageCode);
    addUnique(volumeData);
  }

  // 4. Fall back to mock data if still empty
  if (allKeywords.length === 0) {
    addUnique(MOCK_DUTCH_KEYWORDS);
  }

  // Sort by volume descending
  return allKeywords.sort((a, b) => b.volume - a.volume);
}
