import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportKeywordsCSV(categories: any[], filename = "zoekwoorden") {
  const rows: any[] = [];
  for (const cat of categories) {
    for (const kw of cat.keywords ?? []) {
      rows.push({
        Categorie: cat.name,
        Zoekwoord: kw.keyword,
        Volume: kw.volume ?? 0,
        Prioriteit: kw.priority ?? "",
        Highlight: kw.isHighlight ? "Ja" : "Nee",
      });
    }
  }
  downloadXLSX(rows, filename);
}

export function exportPillarCSV(pillars: any[], filename = "pijler-cluster") {
  const rows: any[] = [];
  for (const p of pillars) {
    for (const c of p.clusters ?? []) {
      for (const kw of c.keywords ?? []) {
        rows.push({
          Pijler: p.name,
          "Pijler Volume": p.totalVolume ?? 0,
          Cluster: c.name,
          Intent: c.intent ?? "",
          "Cluster URL": c.slug ?? "",
          Zoekwoord: kw.keyword,
          Volume: kw.volume ?? 0,
        });
      }
    }
  }
  downloadXLSX(rows, filename);
}

export function exportCampaignsCSV(campaigns: any[], filename = "campagnes") {
  const rows: any[] = [];
  for (const c of campaigns) {
    for (const kw of c.keywords ?? []) {
      rows.push({
        Campagne: c.name,
        Type: c.type ?? "",
        Budget: c.budget ?? 0,
        Zoekwoord: kw.keyword,
        "Match Type": kw.matchType ?? "",
        Volume: kw.volume ?? 0,
        CPC: kw.cpc ?? 0,
        "Landing Page": c.landingPage ?? "",
      });
    }
  }
  downloadXLSX(rows, filename);
}

export function exportAdCopyCSV(adCopyData: any[], filename = "ad-copy") {
  const rows: any[] = [];
  for (const c of adCopyData) {
    for (const h of c.headlines ?? []) {
      rows.push({
        Campagne: c.name,
        Type: "Headline",
        Tekst: typeof h === "string" ? h : h.text,
        Categorie: typeof h === "object" ? h.type ?? "" : "",
      });
    }
    for (const d of c.descriptions ?? []) {
      rows.push({
        Campagne: c.name,
        Type: "Description",
        Tekst: d,
        Categorie: "",
      });
    }
  }
  downloadXLSX(rows, filename);
}

export function exportChecklistCSV(items: any[], filename = "checklist") {
  const rows = items.map((item: any, i: number) => ({
    "#": i + 1,
    Taak: item.task,
    Categorie: item.category ?? "",
    Prioriteit: item.priority ?? "",
  }));
  downloadXLSX(rows, filename);
}

export function exportTop20CSV(top20: any[], filename = "top-20-keywords") {
  const rows = top20.map((kw: any, i: number) => ({
    "#": i + 1,
    Zoekwoord: kw.keyword,
    Volume: kw.volume ?? 0,
    Intent: kw.intent ?? "",
    Type: kw.type ?? "",
    Score: kw.score ?? 0,
  }));
  downloadXLSX(rows, filename);
}

function downloadXLSX(rows: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${filename}.xlsx`);
}

// ─── Full Dashboard Export (all tabs in one XLSX) ─────────────────────────────

export function exportFullDashboard(dash: any, projectName: string) {
  const wb = XLSX.utils.book_new();

  // Overview
  if (dash.overview) {
    const ov = dash.overview;
    const overviewRows = [
      { Metric: "Totaal Zoekvolume", Waarde: ov.kpis?.totalVolume ?? "" },
      { Metric: "SEO Score", Waarde: ov.kpis?.seoScore ?? "" },
      { Metric: "SEA Score", Waarde: ov.kpis?.seaScore ?? "" },
      { Metric: "Traffic Potentie", Waarde: ov.kpis?.trafficPotential ?? "" },
      { Metric: "Geschatte Leads", Waarde: ov.kpis?.estimatedLeads ?? "" },
    ];
    if (ov.strategyBullets?.length) {
      overviewRows.push({ Metric: "", Waarde: "" });
      ov.strategyBullets.forEach((b: string, i: number) => overviewRows.push({ Metric: `Strategie ${i + 1}`, Waarde: b }));
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Overzicht");
  }

  // Keywords
  const cats = Array.isArray(dash.seoKeywords) ? dash.seoKeywords : [];
  if (cats.length) {
    const kwRows: any[] = [];
    for (const cat of cats) {
      for (const kw of cat.keywords ?? []) {
        kwRows.push({ Categorie: cat.name, Zoekwoord: kw.keyword, Volume: kw.volume ?? 0, Prioriteit: kw.priority ?? "", Highlight: kw.isHighlight ? "Ja" : "" });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kwRows), "Zoekwoorden");
  }

  // Pillar-Cluster
  const pillars = Array.isArray(dash.pillarCluster) ? dash.pillarCluster : [];
  if (pillars.length) {
    const pcRows: any[] = [];
    for (const p of pillars) {
      for (const c of p.clusters ?? []) {
        for (const kw of c.keywords ?? []) {
          pcRows.push({ Pijler: p.name, "Pijler Vol": p.totalVolume, Cluster: c.name, Intent: c.intent, URL: c.slug, Zoekwoord: kw.keyword, Volume: kw.volume });
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pcRows), "Pijler-Cluster");
  }

  // Campaigns
  const campaigns = Array.isArray(dash.seaCampaigns) ? dash.seaCampaigns : [];
  if (campaigns.length) {
    const cRows: any[] = [];
    for (const c of campaigns) {
      for (const kw of c.keywords ?? []) {
        cRows.push({ Campagne: c.name, Type: c.type, Budget: c.budget, Zoekwoord: kw.keyword, Match: kw.matchType, Volume: kw.volume, CPC: kw.cpc, "Landing Page": c.landingPage });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cRows), "Campagnes");
  }

  // Ad Copy
  const adCopy = Array.isArray(dash.adCopy) ? dash.adCopy : [];
  if (adCopy.length) {
    const acRows: any[] = [];
    for (const c of adCopy) {
      for (const h of c.headlines ?? []) {
        acRows.push({ Campagne: c.name, Type: "Headline", Tekst: typeof h === "string" ? h : h.text, Categorie: h.type ?? "" });
      }
      for (const d of c.descriptions ?? []) {
        acRows.push({ Campagne: c.name, Type: "Description", Tekst: d, Categorie: "" });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acRows), "Ad Copy");
  }

  // Checklist
  const checklist = Array.isArray(dash.checklist) ? dash.checklist : [];
  if (checklist.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(checklist.map((item: any, i: number) => ({ "#": i + 1, Taak: item.task, Categorie: item.category, Prioriteit: item.priority }))), "Checklist");
  }

  // Top 20
  if (dash.overview?.top20?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dash.overview.top20.map((kw: any, i: number) => ({ "#": i + 1, Zoekwoord: kw.keyword, Volume: kw.volume, Intent: kw.intent, Type: kw.type }))), "Top 20");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${projectName.replace(/\s+/g, "-").toLowerCase()}-dashboard.xlsx`);
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────

export function copyAdCopyToClipboard(campaign: any): string {
  const lines: string[] = [];
  lines.push(`=== ${campaign.name} ===\n`);
  lines.push("HEADLINES:");
  for (const h of campaign.headlines ?? []) {
    const text = typeof h === "string" ? h : h.text;
    const type = typeof h === "object" ? ` [${h.type}]` : "";
    lines.push(`  ${text}${type}`);
  }
  lines.push("\nDESCRIPTIONS:");
  for (const d of campaign.descriptions ?? []) {
    lines.push(`  ${d}`);
  }
  const result = lines.join("\n");
  navigator.clipboard.writeText(result);
  return result;
}

export function copyAllAdCopyToClipboard(campaigns: any[]): string {
  const all = campaigns.map(c => {
    const lines: string[] = [`=== ${c.name} ===`];
    for (const h of c.headlines ?? []) {
      lines.push(typeof h === "string" ? h : h.text);
    }
    lines.push("");
    for (const d of c.descriptions ?? []) {
      lines.push(d);
    }
    return lines.join("\n");
  }).join("\n\n");
  navigator.clipboard.writeText(all);
  return all;
}
