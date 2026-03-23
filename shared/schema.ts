import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ──────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Clients ────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("intake"), // intake | processing | completed | archived
  createdAt: text("created_at").notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ─── Intake Data ────────────────────────────────────────
export const intakeData = sqliteTable("intake_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  productsServices: text("products_services"), // JSON array
  targetAudience: text("target_audience"),
  businessModel: text("business_model"), // B2B | B2C | Both
  country: text("country"),
  language: text("language"),
  region: text("region"),
  competitors: text("competitors"), // JSON array
  seoGoals: text("seo_goals"), // JSON array
  seaGoals: text("sea_goals"), // JSON array
  focusServices: text("focus_services"), // JSON array
  adBudget: text("ad_budget"),
  conversionType: text("conversion_type"),
  priorities: text("priorities"), // JSON array
  extraContext: text("extra_context"),
});

export const insertIntakeSchema = createInsertSchema(intakeData).omit({ id: true });
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type Intake = typeof intakeData.$inferSelect;

// ─── SEO Data (generated) ───────────────────────────────
export const seoData = sqliteTable("seo_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().unique(),
  keywords: text("keywords").notNull(), // JSON: array of keyword objects with volume, difficulty, intent, etc.
  clusters: text("clusters").notNull(), // JSON: keyword clusters
  pillarPages: text("pillar_pages").notNull(), // JSON: pillar-cluster model
  contentIdeas: text("content_ideas").notNull(), // JSON: content structure
  internalLinks: text("internal_links").notNull(), // JSON: link structure
  metadata: text("metadata").notNull(), // JSON: meta recommendations
  priorityMatrix: text("priority_matrix").notNull(), // JSON: priority matrix
});

export const insertSeoSchema = createInsertSchema(seoData).omit({ id: true });
export type InsertSeo = z.infer<typeof insertSeoSchema>;
export type SeoData = typeof seoData.$inferSelect;

// ─── SEA Data (generated) ───────────────────────────────
export const seaData = sqliteTable("sea_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().unique(),
  campaigns: text("campaigns").notNull(), // JSON: campaign architecture
  adGroups: text("ad_groups").notNull(), // JSON: ad groups with keywords
  negativeKeywords: text("negative_keywords").notNull(), // JSON: negative keyword lists
  adCopy: text("ad_copy").notNull(), // JSON: RSA headlines & descriptions
  budgetAllocation: text("budget_allocation").notNull(), // JSON: budget split
  landingPages: text("landing_pages").notNull(), // JSON: landing page recommendations
  bidStrategy: text("bid_strategy").notNull(), // JSON: bid strategy proposals
});

export const insertSeaSchema = createInsertSchema(seaData).omit({ id: true });
export type InsertSea = z.infer<typeof insertSeaSchema>;
export type SeaData = typeof seaData.$inferSelect;

// ─── Strategy Summary ───────────────────────────────────
export const strategySummary = sqliteTable("strategy_summary", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().unique(),
  executiveSummary: text("executive_summary").notNull(),
  keyFindings: text("key_findings").notNull(), // JSON
  recommendations: text("recommendations").notNull(), // JSON
  implementationChecklist: text("implementation_checklist").notNull(), // JSON
  performanceEstimates: text("performance_estimates").notNull(), // JSON
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
