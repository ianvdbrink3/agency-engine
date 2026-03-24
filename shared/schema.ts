import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Settings ───────────────────────────────────────────
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// ─── Users ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Clients ────────────────────────────────────────────
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  shared: boolean("shared").notNull().default(false),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── Projects ───────────────────────────────────────────
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("intake"),
  createdAt: text("created_at").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ─── Intake Data ────────────────────────────────────────
export const intakeData = pgTable("intake_data", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  productsServices: text("products_services"),
  targetAudience: text("target_audience"),
  businessModel: text("business_model"),
  country: text("country"),
  language: text("language"),
  region: text("region"),
  competitors: text("competitors"),
  seoGoals: text("seo_goals"),
  seaGoals: text("sea_goals"),
  focusServices: text("focus_services"),
  adBudget: text("ad_budget"),
  conversionType: text("conversion_type"),
  priorities: text("priorities"),
  extraContext: text("extra_context"),
});

export const insertIntakeSchema = createInsertSchema(intakeData).omit({ id: true });
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type Intake = typeof intakeData.$inferSelect;

// ─── SEO Data (generated) ───────────────────────────────
export const seoData = pgTable("seo_data", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  keywords: text("keywords").notNull(),
  clusters: text("clusters").notNull(),
  pillarPages: text("pillar_pages").notNull(),
  contentIdeas: text("content_ideas").notNull(),
  internalLinks: text("internal_links").notNull(),
  metadata: text("metadata").notNull(),
  priorityMatrix: text("priority_matrix").notNull(),
});

export const insertSeoSchema = createInsertSchema(seoData).omit({ id: true });
export type InsertSeo = z.infer<typeof insertSeoSchema>;
export type SeoData = typeof seoData.$inferSelect;

// ─── SEA Data (generated) ───────────────────────────────
export const seaData = pgTable("sea_data", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  campaigns: text("campaigns").notNull(),
  adGroups: text("ad_groups").notNull(),
  negativeKeywords: text("negative_keywords").notNull(),
  adCopy: text("ad_copy").notNull(),
  budgetAllocation: text("budget_allocation").notNull(),
  landingPages: text("landing_pages").notNull(),
  bidStrategy: text("bid_strategy").notNull(),
});

export const insertSeaSchema = createInsertSchema(seaData).omit({ id: true });
export type InsertSea = z.infer<typeof insertSeaSchema>;
export type SeaData = typeof seaData.$inferSelect;

// ─── Strategy Summary ───────────────────────────────────
export const strategySummary = pgTable("strategy_summary", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  executiveSummary: text("executive_summary").notNull(),
  keyFindings: text("key_findings").notNull(),
  recommendations: text("recommendations").notNull(),
  implementationChecklist: text("implementation_checklist").notNull(),
  performanceEstimates: text("performance_estimates").notNull(),
});

export const insertStrategySummarySchema = createInsertSchema(strategySummary).omit({ id: true });
export type InsertStrategySummary = z.infer<typeof insertStrategySummarySchema>;
export type StrategySummary = typeof strategySummary.$inferSelect;

// ─── Shared types for JSON fields ───────────────────────
export interface KeywordEntry {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: "informational" | "navigational" | "transactional" | "commercial";
  category: "primary" | "secondary" | "long-tail";
  cluster?: string;
}

export interface KeywordCluster {
  name: string;
  pillarKeyword: string;
  keywords: KeywordEntry[];
  totalVolume: number;
  avgDifficulty: number;
  intent: string;
}

export interface PillarPage {
  title: string;
  slug: string;
  pillarKeyword: string;
  clusterPages: { title: string; slug: string; keyword: string }[];
  totalVolume: number;
}

export interface Campaign {
  name: string;
  type: string;
  objective: string;
  budget: number;
  budgetPercent: number;
  adGroups: AdGroup[];
}

export interface AdGroup {
  name: string;
  keywords: { keyword: string; matchType: string; volume: number }[];
  headlines: string[];
  descriptions: string[];
  landingPage: string;
}

export interface ChecklistItem {
  task: string;
  category: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
}
