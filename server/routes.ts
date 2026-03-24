import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gatherKeywordsForIntake } from "./dataforseo";
import { generateStrategyWithClaude } from "./claude-service";
import {
  insertClientSchema,
  insertProjectSchema,
  insertIntakeSchema,
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseId(param: string | string[]): number | null {
  const s = Array.isArray(param) ? param[0] : param;
  if (!s) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
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

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Simple token-based auth (stored in memory, works with serverless)
// In production you'd use JWT, but this is simple and works
const TOKEN_HEADER = "x-auth-token";

async function getUserFromRequest(req: Request): Promise<{ id: number; username: string; displayName: string | null } | null> {
  const token = req.headers[TOKEN_HEADER] as string;
  if (!token) return null;
  // Token format: base64(userId:hashedPassword)
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userIdStr, hash] = decoded.split(":");
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;
    const user = await storage.getUser(userId);
    if (!user || user.password !== hash) return null;
    return { id: user.id, username: user.username, displayName: user.displayName };
  } catch {
    return null;
  }
}

function requireAuth(req: Request, res: Response): Promise<{ id: number; username: string; displayName: string | null } | null> {
  return getUserFromRequest(req).then((user) => {
    if (!user) {
      res.status(401).json({ message: "Niet ingelogd" });
      return null;
    }
    return user;
  });
}

// ─── Route Registration ────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  // POST /api/auth/register — create account (requires invite code)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, displayName, inviteCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "E-mailadres en wachtwoord zijn verplicht" });
      }
      if (password.length < 4) {
        return res.status(400).json({ message: "Wachtwoord moet minimaal 4 tekens zijn" });
      }

      // Check invite code — stored in settings as "invite_code"
      const storedCode = await storage.getSetting("invite_code");
      if (storedCode && storedCode !== inviteCode) {
        return res.status(403).json({ message: "Ongeldige uitnodigingscode" });
      }
      if (!storedCode) {
        const code = crypto.randomBytes(6).toString("hex");
        await storage.setSetting("invite_code", code);
      }

      // Use email as username
      const existing = await storage.getUserByUsername(email);
      if (existing) {
        return res.status(409).json({ message: "Dit e-mailadres is al geregistreerd" });
      }
      const hashed = hashPassword(password);
      const user = await storage.createUser({
        username: email,
        email,
        password: hashed,
        displayName: displayName || email.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      const token = Buffer.from(`${user.id}:${hashed}`).toString("base64");
      return res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
        token,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/auth/login — login (accepts email or username)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "E-mailadres en wachtwoord zijn verplicht" });
      }
      const user = await storage.getUserByUsername(username);
      const hashed = hashPassword(password);
      if (!user || user.password !== hashed) {
        return res.status(401).json({ message: "Ongeldig e-mailadres of wachtwoord" });
      }
      const token = Buffer.from(`${user.id}:${hashed}`).toString("base64");
      return res.json({
        user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
        token,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // GET /api/auth/me — get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: "Niet ingelogd" });
    return res.json({ user });
  });

  // GET /api/users — list all team members (no passwords)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const all = await storage.listUsers();
      return res.json(all.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        createdAt: u.createdAt,
      })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // DELETE /api/users/:id — delete a user
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid user ID" });
      const currentUser = await getUserFromRequest(req);
      if (currentUser && currentUser.id === id) {
        return res.status(400).json({ message: "Je kunt jezelf niet verwijderen" });
      }
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: "Gebruiker niet gevonden" });
      await storage.deleteUser(id);
      return res.json({ message: "Gebruiker verwijderd" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Clients ────────────────────────────────────────────────────────────────

  // GET /api/clients — list own clients + shared clients
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (user) {
        const own = await storage.listClientsByUser(user.id);
        const shared = await storage.listSharedClients();
        // Merge: own clients that are not shared + all shared (deduplicated)
        const ownIds = new Set(own.map((c) => c.id));
        const combined = [
          ...own,
          ...shared.filter((c) => !ownIds.has(c.id)),
        ];
        return res.json(combined);
      }
      const all = await storage.listClients();
      return res.json(all);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/clients — create client
  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      const parsed = insertClientSchema.safeParse({
        ...req.body,
        userId: user?.id ?? null,
        shared: req.body.shared ?? false,
        createdAt: req.body.createdAt ?? new Date().toISOString(),
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }
      const client = await storage.createClient(parsed.data);
      return res.status(201).json(client);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // GET /api/clients/:id — get single client
  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid client ID" });
      const client = await storage.getClient(id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      return res.json(client);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // PUT /api/clients/:id — update client
  app.put("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid client ID" });
      const existing = await storage.getClient(id);
      if (!existing) return res.status(404).json({ message: "Client not found" });

      const updateSchema = insertClientSchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateClient(id, parsed.data);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // DELETE /api/clients/:id — delete client
  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid client ID" });
      const deleted = await storage.deleteClient(id);
      if (!deleted) return res.status(404).json({ message: "Client not found" });
      return res.json({ message: "Client deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Projects ───────────────────────────────────────────────────────────────

  // GET /api/clients/:clientId/projects — list projects for a client
  app.get("/api/clients/:clientId/projects", async (req: Request, res: Response) => {
    try {
      const clientId = parseId(req.params.clientId);
      if (!clientId) return res.status(400).json({ message: "Invalid client ID" });
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const projectList = await storage.listProjectsByClient(clientId);
      return res.json(projectList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/projects — create project (clientId in body)
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const clientId = parseId(req.body.clientId);
      if (!clientId) return res.status(400).json({ message: "Invalid or missing clientId" });
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const parsed = insertProjectSchema.safeParse({
        ...req.body,
        clientId,
        status: req.body.status ?? "intake",
        createdAt: req.body.createdAt ?? new Date().toISOString(),
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }
      const project = await storage.createProject(parsed.data);
      return res.status(201).json(project);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/clients/:clientId/projects — create project for a client
  app.post("/api/clients/:clientId/projects", async (req: Request, res: Response) => {
    try {
      const clientId = parseId(req.params.clientId);
      if (!clientId) return res.status(400).json({ message: "Invalid client ID" });
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const parsed = insertProjectSchema.safeParse({
        ...req.body,
        clientId,
        status: req.body.status ?? "intake",
        createdAt: req.body.createdAt ?? new Date().toISOString(),
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }
      const project = await storage.createProject(parsed.data);
      return res.status(201).json(project);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // GET /api/projects/:id — get single project
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      return res.json(project);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // PUT /api/projects/:id — update project
  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const existing = await storage.getProject(id);
      if (!existing) return res.status(404).json({ message: "Project not found" });

      const updateSchema = insertProjectSchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateProject(id, parsed.data);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // DELETE /api/projects/:id — delete project
  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const deleted = await storage.deleteProject(id);
      if (!deleted) return res.status(404).json({ message: "Project not found" });
      return res.json({ message: "Project deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Intake ─────────────────────────────────────────────────────────────────

  // POST /api/intake — create intake data (projectId in body)
  app.post("/api/intake", async (req: Request, res: Response) => {
    try {
      const projectId = parseId(req.body.projectId);
      if (!projectId) return res.status(400).json({ message: "Invalid or missing projectId" });
      const project = await storage.getProject(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const parsed = insertIntakeSchema.safeParse({ ...req.body, projectId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }

      const existing = await storage.getIntakeData(projectId);
      let intake;
      if (existing) {
        intake = await storage.updateIntakeData(projectId, parsed.data);
      } else {
        intake = await storage.createIntakeData(parsed.data);
      }
      return res.status(existing ? 200 : 201).json(intake);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // GET /api/projects/:id/intake
  app.get("/api/projects/:id/intake", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const intake = await storage.getIntakeData(id);
      if (!intake) return res.status(404).json({ message: "Intake data not found" });
      return res.json(intake);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/projects/:id/intake — create intake data
  app.post("/api/projects/:id/intake", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const parsed = insertIntakeSchema.safeParse({ ...req.body, projectId: id });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }

      // Upsert: create or update
      const existing = await storage.getIntakeData(id);
      let intake;
      if (existing) {
        intake = await storage.updateIntakeData(id, parsed.data);
      } else {
        intake = await storage.createIntakeData(parsed.data);
      }
      return res.status(existing ? 200 : 201).json(intake);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // PUT /api/projects/:id/intake — update intake data
  app.put("/api/projects/:id/intake", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const updateSchema = insertIntakeSchema.partial();
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.flatten() });
      }

      const existing = await storage.getIntakeData(id);
      if (!existing) {
        // If no intake exists yet, require full data
        const fullParsed = insertIntakeSchema.safeParse({ ...req.body, projectId: id });
        if (!fullParsed.success) {
          return res.status(404).json({ message: "Intake data not found — use POST to create" });
        }
        const created = await storage.createIntakeData(fullParsed.data);
        return res.status(201).json(created);
      }

      const updated = await storage.updateIntakeData(id, parsed.data);
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Generate Strategy ──────────────────────────────────────────────────────

  // POST /api/projects/:id/generate — triggers strategy generation (type: seo, sea, or both)
  app.post("/api/projects/:id/generate", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const type = ((req.body && req.body.type) || "both") as "seo" | "sea" | "both";

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const intake = await storage.getIntakeData(id);
      if (!intake) return res.status(422).json({ message: "Intake data required before generating strategy" });

      await storage.updateProjectStatus(id, "processing");

      try {
        // Try to get keywords from DataForSEO with a 10s timeout
        let keywords: any[] = [];
        try {
          const focusServices = parseJsonArray(intake.focusServices);
          const keywordPromise = gatherKeywordsForIntake({
            domain: intake.domain,
            focusServices,
            companyName: intake.companyName,
            industry: intake.industry,
            country: intake.country,
            language: intake.language,
          });
          const timeoutPromise = new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error("DataForSEO timeout")), 10000)
          );
          keywords = await Promise.race([keywordPromise, timeoutPromise]);
        } catch (e) {
          console.log("[Generate] DataForSEO skipped or failed, Claude will generate keywords:", (e as Error).message);
          // Empty keywords - Claude will generate its own
        }

        const strategy = await generateStrategyWithClaude(intake, keywords, type);

        // Upsert SEO data (if generated)
        if (strategy.seo) {
          const existingSeo = await storage.getSeoData(id);
          if (existingSeo) { await storage.updateSeoData(id, strategy.seo); }
          else { await storage.createSeoData(strategy.seo); }
        }

        // Upsert SEA data (if generated)
        if (strategy.sea) {
          const existingSea = await storage.getSeaData(id);
          if (existingSea) { await storage.updateSeaData(id, strategy.sea); }
          else { await storage.createSeaData(strategy.sea); }
        }

        // Upsert summary (always generated)
        if (strategy.summary) {
          const existingSummary = await storage.getStrategySummary(id);
          if (existingSummary) { await storage.updateStrategySummary(id, strategy.summary); }
          else { await storage.createStrategySummary(strategy.summary); }
        }

        const updatedProject = await storage.updateProjectStatus(id, "completed");

        return res.json({
          message: "Strategy generated successfully",
          project: updatedProject,
          keywordCount: keywords.length,
          type,
        });
      } catch (genErr: any) {
        await storage.updateProjectStatus(id, "intake");
        throw genErr;
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── SEO Data ───────────────────────────────────────────────────────────────

  // GET /api/projects/:id/seo
  app.get("/api/projects/:id/seo", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const seo = await storage.getSeoData(id);
      if (!seo) return res.status(404).json({ message: "SEO data not found — run /generate first" });
      return res.json(seo);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── SEA Data ───────────────────────────────────────────────────────────────

  // GET /api/projects/:id/sea
  app.get("/api/projects/:id/sea", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const sea = await storage.getSeaData(id);
      if (!sea) return res.status(404).json({ message: "SEA data not found — run /generate first" });
      return res.json(sea);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Strategy Summary ───────────────────────────────────────────────────────

  // GET /api/projects/:id/summary
  app.get("/api/projects/:id/summary", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const summary = await storage.getStrategySummary(id);
      if (!summary) return res.status(404).json({ message: "Strategy summary not found — run /generate first" });
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Dashboard ──────────────────────────────────────────────────────────────

  // GET /api/projects/:id/dashboard — all data combined
  app.get("/api/projects/:id/dashboard", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const client = await storage.getClient(project.clientId);
      const intake = await storage.getIntakeData(id);
      const seo = await storage.getSeoData(id);
      const sea = await storage.getSeaData(id);
      const summary = await storage.getStrategySummary(id);

      // Parse JSON fields for convenience
      const parsedSeo = seo
        ? {
            ...seo,
            keywords: JSON.parse(seo.keywords),
            clusters: JSON.parse(seo.clusters),
            pillarPages: JSON.parse(seo.pillarPages),
            contentIdeas: JSON.parse(seo.contentIdeas),
            internalLinks: JSON.parse(seo.internalLinks),
            metadata: JSON.parse(seo.metadata),
            priorityMatrix: JSON.parse(seo.priorityMatrix),
          }
        : null;

      const parsedSea = sea
        ? {
            ...sea,
            campaigns: JSON.parse(sea.campaigns),
            adGroups: JSON.parse(sea.adGroups),
            negativeKeywords: JSON.parse(sea.negativeKeywords),
            adCopy: JSON.parse(sea.adCopy),
            budgetAllocation: JSON.parse(sea.budgetAllocation),
            landingPages: JSON.parse(sea.landingPages),
            bidStrategy: JSON.parse(sea.bidStrategy),
          }
        : null;

      const parsedSummary = summary
        ? {
            ...summary,
            keyFindings: JSON.parse(summary.keyFindings),
            recommendations: JSON.parse(summary.recommendations),
            implementationChecklist: JSON.parse(summary.implementationChecklist),
            performanceEstimates: JSON.parse(summary.performanceEstimates),
          }
        : null;

      return res.json({
        project,
        client: client ?? null,
        intake: intake ?? null,
        seo: parsedSeo,
        sea: parsedSea,
        summary: parsedSummary,
        isComplete: project.status === "completed",
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  // GET /api/settings — get all settings (values masked for sensitive keys)
  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const all = await storage.getAllSettings();
      const masked = all.map((s) => ({
        ...s,
        value: s.key.toLowerCase().includes("key") || s.key.toLowerCase().includes("password")
          ? s.value.substring(0, 8) + "..." + s.value.substring(s.value.length - 4)
          : s.value,
      }));
      return res.json(masked);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // GET /api/settings/:key — get single setting
  app.get("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const value = await storage.getSetting(req.params.key);
      if (value === undefined) return res.status(404).json({ message: "Setting not found" });
      return res.json({ key: req.params.key, value });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // PUT /api/settings — upsert multiple settings
  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const entries = req.body as { key: string; value: string }[];
      if (!Array.isArray(entries)) {
        return res.status(400).json({ message: "Body must be an array of {key, value} objects" });
      }
      const results = [];
      for (const entry of entries) {
        if (!entry.key || typeof entry.value !== "string") continue;
        const result = await storage.setSetting(entry.key, entry.value);
        results.push(result);
      }
      return res.json({ message: "Settings saved", count: results.length });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // DELETE /api/settings/:key — delete a setting
  app.delete("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteSetting(req.params.key);
      if (!deleted) return res.status(404).json({ message: "Setting not found" });
      return res.json({ message: "Setting deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  return httpServer;
}
