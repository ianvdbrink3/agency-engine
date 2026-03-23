import {
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Project,
  type InsertProject,
  type Intake,
  type InsertIntake,
  type SeoData,
  type InsertSeo,
  type SeaData,
  type InsertSea,
  type StrategySummary,
  type InsertStrategySummary,
} from "@shared/schema";
import initSqlJs, { type Database } from "sql.js";
import fs from "fs";
import path from "path";

// ─── Database Initialization ────────────────────────────────────────────────

let db: Database;

const DB_PATH = path.resolve("data.db");
const isVercel = process.env.VERCEL === "1";

async function initDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs(
    isVercel
      ? { locateFile: (file: string) => `https://sql.js.org/dist/${file}` }
      : undefined
  );

  if (!isVercel && fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT,
      industry TEXT,
      contact_name TEXT,
      contact_email TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'intake',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS intake_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      domain TEXT,
      industry TEXT,
      products_services TEXT,
      target_audience TEXT,
      business_model TEXT,
      country TEXT,
      language TEXT,
      region TEXT,
      competitors TEXT,
      seo_goals TEXT,
      sea_goals TEXT,
      focus_services TEXT,
      ad_budget TEXT,
      conversion_type TEXT,
      priorities TEXT,
      extra_context TEXT
    );
    CREATE TABLE IF NOT EXISTS seo_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      keywords TEXT NOT NULL,
      clusters TEXT NOT NULL,
      pillar_pages TEXT NOT NULL,
      content_ideas TEXT NOT NULL,
      internal_links TEXT NOT NULL,
      metadata TEXT NOT NULL,
      priority_matrix TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sea_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      campaigns TEXT NOT NULL,
      ad_groups TEXT NOT NULL,
      negative_keywords TEXT NOT NULL,
      ad_copy TEXT NOT NULL,
      budget_allocation TEXT NOT NULL,
      landing_pages TEXT NOT NULL,
      bid_strategy TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS strategy_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE,
      executive_summary TEXT NOT NULL,
      key_findings TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      implementation_checklist TEXT NOT NULL,
      performance_estimates TEXT NOT NULL
    );
  `);

  return db;
}

// Start initialization immediately
const dbReady = initDb();

// ─── SQL Helpers ────────────────────────────────────────────────────────────

function rowToObject(columns: string[], values: any[]): Record<string, any> {
  const obj: Record<string, any> = {};
  columns.forEach((col, i) => {
    const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    obj[camelCol] = values[i];
  });
  return obj;
}

function saveToFile() {
  if (!isVercel && db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const database = await dbReady;
  const stmt = database.prepare(sql);
  if (params.length) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    results.push(rowToObject(columns, values) as T);
  }
  stmt.free();
  return results;
}

async function queryOne<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  const results = await queryAll<T>(sql, params);
  return results[0];
}

async function runSql(sql: string, params: any[] = []): Promise<{ changes: number; lastId: number }> {
  const database = await dbReady;
  database.run(sql, params);
  const changes = database.getRowsModified();
  const lastIdResult = database.exec("SELECT last_insert_rowid() as id");
  const lastId = lastIdResult.length > 0 ? (lastIdResult[0].values[0][0] as number) : 0;
  saveToFile();
  return { changes, lastId };
}

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  listProjectsByClient(clientId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProjectStatus(id: number, status: string): Promise<Project | undefined>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getIntakeData(projectId: number): Promise<Intake | undefined>;
  createIntakeData(data: InsertIntake): Promise<Intake>;
  updateIntakeData(projectId: number, data: Partial<InsertIntake>): Promise<Intake | undefined>;
  getSeoData(projectId: number): Promise<SeoData | undefined>;
  createSeoData(data: InsertSeo): Promise<SeoData>;
  updateSeoData(projectId: number, data: Partial<InsertSeo>): Promise<SeoData | undefined>;
  getSeaData(projectId: number): Promise<SeaData | undefined>;
  createSeaData(data: InsertSea): Promise<SeaData>;
  updateSeaData(projectId: number, data: Partial<InsertSea>): Promise<SeaData | undefined>;
  getStrategySummary(projectId: number): Promise<StrategySummary | undefined>;
  createStrategySummary(data: InsertStrategySummary): Promise<StrategySummary>;
  updateStrategySummary(projectId: number, data: Partial<InsertStrategySummary>): Promise<StrategySummary | undefined>;
}

// ─── Implementation ─────────────────────────────────────────────────────────

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return queryOne<User>("SELECT * FROM users WHERE id = ?", [id]);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return queryOne<User>("SELECT * FROM users WHERE username = ?", [username]);
  }

  async createUser(user: InsertUser): Promise<User> {
    const { lastId } = await runSql("INSERT INTO users (username, password) VALUES (?, ?)", [user.username, user.password]);
    return (await queryOne<User>("SELECT * FROM users WHERE id = ?", [lastId]))!;
  }

  async listClients(): Promise<Client[]> {
    return queryAll<Client>("SELECT * FROM clients");
  }

  async getClient(id: number): Promise<Client | undefined> {
    return queryOne<Client>("SELECT * FROM clients WHERE id = ?", [id]);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const { lastId } = await runSql(
      "INSERT INTO clients (name, domain, industry, contact_name, contact_email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [client.name, client.domain ?? null, client.industry ?? null, client.contactName ?? null, client.contactEmail ?? null, client.notes ?? null, client.createdAt]
    );
    return (await queryOne<Client>("SELECT * FROM clients WHERE id = ?", [lastId]))!;
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
    if (data.domain !== undefined) { sets.push("domain = ?"); values.push(data.domain); }
    if (data.industry !== undefined) { sets.push("industry = ?"); values.push(data.industry); }
    if (data.contactName !== undefined) { sets.push("contact_name = ?"); values.push(data.contactName); }
    if (data.contactEmail !== undefined) { sets.push("contact_email = ?"); values.push(data.contactEmail); }
    if (data.notes !== undefined) { sets.push("notes = ?"); values.push(data.notes); }
    if (sets.length === 0) return this.getClient(id);
    values.push(id);
    await runSql(`UPDATE clients SET ${sets.join(", ")} WHERE id = ?`, values);
    return this.getClient(id);
  }

  async deleteClient(id: number): Promise<boolean> {
    const { changes } = await runSql("DELETE FROM clients WHERE id = ?", [id]);
    return changes > 0;
  }

  async listProjectsByClient(clientId: number): Promise<Project[]> {
    return queryAll<Project>("SELECT * FROM projects WHERE client_id = ?", [clientId]);
  }

  async getProject(id: number): Promise<Project | undefined> {
    return queryOne<Project>("SELECT * FROM projects WHERE id = ?", [id]);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const { lastId } = await runSql(
      "INSERT INTO projects (client_id, name, status, created_at) VALUES (?, ?, ?, ?)",
      [project.clientId, project.name, project.status ?? "intake", project.createdAt]
    );
    return (await queryOne<Project>("SELECT * FROM projects WHERE id = ?", [lastId]))!;
  }

  async updateProjectStatus(id: number, status: string): Promise<Project | undefined> {
    await runSql("UPDATE projects SET status = ? WHERE id = ?", [status, id]);
    return this.getProject(id);
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const sets: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { sets.push("name = ?"); values.push(data.name); }
    if (data.status !== undefined) { sets.push("status = ?"); values.push(data.status); }
    if (data.clientId !== undefined) { sets.push("client_id = ?"); values.push(data.clientId); }
    if (sets.length === 0) return this.getProject(id);
    values.push(id);
    await runSql(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`, values);
    return this.getProject(id);
  }

  async deleteProject(id: number): Promise<boolean> {
    const { changes } = await runSql("DELETE FROM projects WHERE id = ?", [id]);
    return changes > 0;
  }

  async getIntakeData(projectId: number): Promise<Intake | undefined> {
    return queryOne<Intake>("SELECT * FROM intake_data WHERE project_id = ?", [projectId]);
  }

  async createIntakeData(data: InsertIntake): Promise<Intake> {
    const { lastId } = await runSql(
      "INSERT INTO intake_data (project_id, company_name, domain, industry, products_services, target_audience, business_model, country, language, region, competitors, seo_goals, sea_goals, focus_services, ad_budget, conversion_type, priorities, extra_context) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [data.projectId, data.companyName, data.domain ?? null, data.industry ?? null, data.productsServices ?? null, data.targetAudience ?? null, data.businessModel ?? null, data.country ?? null, data.language ?? null, data.region ?? null, data.competitors ?? null, data.seoGoals ?? null, data.seaGoals ?? null, data.focusServices ?? null, data.adBudget ?? null, data.conversionType ?? null, data.priorities ?? null, data.extraContext ?? null]
    );
    return (await queryOne<Intake>("SELECT * FROM intake_data WHERE id = ?", [lastId]))!;
  }

  async updateIntakeData(projectId: number, data: Partial<InsertIntake>): Promise<Intake | undefined> {
    const sets: string[] = [];
    const values: any[] = [];
    const fieldMap: Record<string, string> = {
      companyName: "company_name", domain: "domain", industry: "industry",
      productsServices: "products_services", targetAudience: "target_audience",
      businessModel: "business_model", country: "country", language: "language",
      region: "region", competitors: "competitors", seoGoals: "seo_goals",
      seaGoals: "sea_goals", focusServices: "focus_services", adBudget: "ad_budget",
      conversionType: "conversion_type", priorities: "priorities", extraContext: "extra_context",
    };
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if ((data as any)[camel] !== undefined) { sets.push(`${snake} = ?`); values.push((data as any)[camel]); }
    }
    if (sets.length === 0) return this.getIntakeData(projectId);
    values.push(projectId);
    await runSql(`UPDATE intake_data SET ${sets.join(", ")} WHERE project_id = ?`, values);
    return this.getIntakeData(projectId);
  }

  async getSeoData(projectId: number): Promise<SeoData | undefined> {
    return queryOne<SeoData>("SELECT * FROM seo_data WHERE project_id = ?", [projectId]);
  }

  async createSeoData(data: InsertSeo): Promise<SeoData> {
    const { lastId } = await runSql(
      "INSERT INTO seo_data (project_id, keywords, clusters, pillar_pages, content_ideas, internal_links, metadata, priority_matrix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [data.projectId, data.keywords, data.clusters, data.pillarPages, data.contentIdeas, data.internalLinks, data.metadata, data.priorityMatrix]
    );
    return (await queryOne<SeoData>("SELECT * FROM seo_data WHERE id = ?", [lastId]))!;
  }

  async updateSeoData(projectId: number, data: Partial<InsertSeo>): Promise<SeoData | undefined> {
    const sets: string[] = [];
    const values: any[] = [];
    const fieldMap: Record<string, string> = {
      keywords: "keywords", clusters: "clusters", pillarPages: "pillar_pages",
      contentIdeas: "content_ideas", internalLinks: "internal_links",
      metadata: "metadata", priorityMatrix: "priority_matrix",
    };
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if ((data as any)[camel] !== undefined) { sets.push(`${snake} = ?`); values.push((data as any)[camel]); }
    }
    if (sets.length === 0) return this.getSeoData(projectId);
    values.push(projectId);
    await runSql(`UPDATE seo_data SET ${sets.join(", ")} WHERE project_id = ?`, values);
    return this.getSeoData(projectId);
  }

  async getSeaData(projectId: number): Promise<SeaData | undefined> {
    return queryOne<SeaData>("SELECT * FROM sea_data WHERE project_id = ?", [projectId]);
  }

  async createSeaData(data: InsertSea): Promise<SeaData> {
    const { lastId } = await runSql(
      "INSERT INTO sea_data (project_id, campaigns, ad_groups, negative_keywords, ad_copy, budget_allocation, landing_pages, bid_strategy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [data.projectId, data.campaigns, data.adGroups, data.negativeKeywords, data.adCopy, data.budgetAllocation, data.landingPages, data.bidStrategy]
    );
    return (await queryOne<SeaData>("SELECT * FROM sea_data WHERE id = ?", [lastId]))!;
  }

  async updateSeaData(projectId: number, data: Partial<InsertSea>): Promise<SeaData | undefined> {
    const sets: string[] = [];
    const values: any[] = [];
    const fieldMap: Record<string, string> = {
      campaigns: "campaigns", adGroups: "ad_groups", negativeKeywords: "negative_keywords",
      adCopy: "ad_copy", budgetAllocation: "budget_allocation",
      landingPages: "landing_pages", bidStrategy: "bid_strategy",
    };
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if ((data as any)[camel] !== undefined) { sets.push(`${snake} = ?`); values.push((data as any)[camel]); }
    }
    if (sets.length === 0) return this.getSeaData(projectId);
    values.push(projectId);
    await runSql(`UPDATE sea_data SET ${sets.join(", ")} WHERE project_id = ?`, values);
    return this.getSeaData(projectId);
  }

  async getStrategySummary(projectId: number): Promise<StrategySummary | undefined> {
    return queryOne<StrategySummary>("SELECT * FROM strategy_summary WHERE project_id = ?", [projectId]);
  }

  async createStrategySummary(data: InsertStrategySummary): Promise<StrategySummary> {
    const { lastId } = await runSql(
      "INSERT INTO strategy_summary (project_id, executive_summary, key_findings, recommendations, implementation_checklist, performance_estimates) VALUES (?, ?, ?, ?, ?, ?)",
      [data.projectId, data.executiveSummary, data.keyFindings, data.recommendations, data.implementationChecklist, data.performanceEstimates]
    );
    return (await queryOne<StrategySummary>("SELECT * FROM strategy_summary WHERE id = ?", [lastId]))!;
  }

  async updateStrategySummary(projectId: number, data: Partial<InsertStrategySummary>): Promise<StrategySummary | undefined> {
    const sets: string[] = [];
    const values: any[] = [];
    const fieldMap: Record<string, string> = {
      executiveSummary: "executive_summary", keyFindings: "key_findings",
      recommendations: "recommendations", implementationChecklist: "implementation_checklist",
      performanceEstimates: "performance_estimates",
    };
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if ((data as any)[camel] !== undefined) { sets.push(`${snake} = ?`); values.push((data as any)[camel]); }
    }
    if (sets.length === 0) return this.getStrategySummary(projectId);
    values.push(projectId);
    await runSql(`UPDATE strategy_summary SET ${sets.join(", ")} WHERE project_id = ?`, values);
    return this.getStrategySummary(projectId);
  }
}

export const storage = new DatabaseStorage();
