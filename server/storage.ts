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
  type StrategyDashboardRow,
  type InsertStrategyDashboard,
  type Setting,
  users,
  clients,
  projects,
  intakeData,
  seoData,
  seaData,
  strategySummary,
  strategyDashboard,
  settings,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

// ─── Database Initialization ────────────────────────────────────────────────

const sql = neon(process.env.database_DATABASE_URL || process.env.DATABASE_URL!);
const db = drizzle(sql);

// Auto-create strategy_dashboard table if not exists
(async () => {
  try {
    await sql`CREATE TABLE IF NOT EXISTS strategy_dashboard (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL UNIQUE,
      overview TEXT NOT NULL,
      seo_keywords TEXT NOT NULL,
      pillar_cluster TEXT NOT NULL,
      sea_campaigns TEXT NOT NULL,
      ad_copy TEXT NOT NULL,
      negatives TEXT NOT NULL,
      targeting TEXT NOT NULL,
      performance TEXT NOT NULL,
      checklist TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`;
  } catch (e) {
    console.warn("strategy_dashboard table creation skipped:", (e as Error).message);
  }
})();

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
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
  deleteSetting(key: string): Promise<boolean>;
}

// ─── Implementation ─────────────────────────────────────────────────────────

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(user).returning();
    return rows[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    if (Object.keys(data).length === 0) return this.getUser(id);
    const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0];
  }

  async listUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    const rows = await db.delete(users).where(eq(users.id, id)).returning();
    return rows.length > 0;
  }

  async listClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  async listClientsByUser(userId: number): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.userId, userId));
  }

  async listSharedClients(): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.shared, true));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const rows = await db.select().from(clients).where(eq(clients.id, id));
    return rows[0];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const rows = await db.insert(clients).values(client).returning();
    return rows[0];
  }

  async updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined> {
    if (Object.keys(data).length === 0) return this.getClient(id);
    const rows = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return rows[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    const rows = await db.delete(clients).where(eq(clients.id, id)).returning();
    return rows.length > 0;
  }

  async listProjectsByClient(clientId: number): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const rows = await db.select().from(projects).where(eq(projects.id, id));
    return rows[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const rows = await db.insert(projects).values(project).returning();
    return rows[0];
  }

  async updateProjectStatus(id: number, status: string): Promise<Project | undefined> {
    const rows = await db.update(projects).set({ status }).where(eq(projects.id, id)).returning();
    return rows[0];
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    if (Object.keys(data).length === 0) return this.getProject(id);
    const rows = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return rows[0];
  }

  async deleteProject(id: number): Promise<boolean> {
    const rows = await db.delete(projects).where(eq(projects.id, id)).returning();
    return rows.length > 0;
  }

  async getIntakeData(projectId: number): Promise<Intake | undefined> {
    const rows = await db.select().from(intakeData).where(eq(intakeData.projectId, projectId));
    return rows[0];
  }

  async createIntakeData(data: InsertIntake): Promise<Intake> {
    const rows = await db.insert(intakeData).values(data).returning();
    return rows[0];
  }

  async updateIntakeData(projectId: number, data: Partial<InsertIntake>): Promise<Intake | undefined> {
    if (Object.keys(data).length === 0) return this.getIntakeData(projectId);
    const rows = await db.update(intakeData).set(data).where(eq(intakeData.projectId, projectId)).returning();
    return rows[0];
  }

  async getSeoData(projectId: number): Promise<SeoData | undefined> {
    const rows = await db.select().from(seoData).where(eq(seoData.projectId, projectId));
    return rows[0];
  }

  async createSeoData(data: InsertSeo): Promise<SeoData> {
    const rows = await db.insert(seoData).values(data).returning();
    return rows[0];
  }

  async updateSeoData(projectId: number, data: Partial<InsertSeo>): Promise<SeoData | undefined> {
    if (Object.keys(data).length === 0) return this.getSeoData(projectId);
    const rows = await db.update(seoData).set(data).where(eq(seoData.projectId, projectId)).returning();
    return rows[0];
  }

  async getSeaData(projectId: number): Promise<SeaData | undefined> {
    const rows = await db.select().from(seaData).where(eq(seaData.projectId, projectId));
    return rows[0];
  }

  async createSeaData(data: InsertSea): Promise<SeaData> {
    const rows = await db.insert(seaData).values(data).returning();
    return rows[0];
  }

  async updateSeaData(projectId: number, data: Partial<InsertSea>): Promise<SeaData | undefined> {
    if (Object.keys(data).length === 0) return this.getSeaData(projectId);
    const rows = await db.update(seaData).set(data).where(eq(seaData.projectId, projectId)).returning();
    return rows[0];
  }

  async getStrategySummary(projectId: number): Promise<StrategySummary | undefined> {
    const rows = await db.select().from(strategySummary).where(eq(strategySummary.projectId, projectId));
    return rows[0];
  }

  async createStrategySummary(data: InsertStrategySummary): Promise<StrategySummary> {
    const rows = await db.insert(strategySummary).values(data).returning();
    return rows[0];
  }

  async updateStrategySummary(projectId: number, data: Partial<InsertStrategySummary>): Promise<StrategySummary | undefined> {
    if (Object.keys(data).length === 0) return this.getStrategySummary(projectId);
    const rows = await db.update(strategySummary).set(data).where(eq(strategySummary.projectId, projectId)).returning();
    return rows[0];
  }

  async getSetting(key: string): Promise<string | undefined> {
    const rows = await db.select().from(settings).where(eq(settings.key, key));
    return rows[0]?.value;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    // Upsert: try update first, then insert
    const existing = await db.select().from(settings).where(eq(settings.key, key));
    if (existing.length > 0) {
      const rows = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
      return rows[0];
    }
    const rows = await db.insert(settings).values({ key, value }).returning();
    return rows[0];
  }

  async getAllSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async deleteSetting(key: string): Promise<boolean> {
    const rows = await db.delete(settings).where(eq(settings.key, key)).returning();
    return rows.length > 0;
  }

  // ─── Strategy Dashboard ─────────────────────────────────────────────────
  async getStrategyDashboard(projectId: number): Promise<StrategyDashboardRow | undefined> {
    const rows = await db.select().from(strategyDashboard).where(eq(strategyDashboard.projectId, projectId));
    return rows[0];
  }

  async createStrategyDashboard(data: InsertStrategyDashboard): Promise<StrategyDashboardRow> {
    const rows = await db.insert(strategyDashboard).values(data).returning();
    return rows[0];
  }

  async updateStrategyDashboard(projectId: number, data: Partial<InsertStrategyDashboard>): Promise<StrategyDashboardRow | undefined> {
    if (Object.keys(data).length === 0) return this.getStrategyDashboard(projectId);
    const rows = await db.update(strategyDashboard).set(data).where(eq(strategyDashboard.projectId, projectId)).returning();
    return rows[0];
  }
}

export const storage = new DatabaseStorage();
