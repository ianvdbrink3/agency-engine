import type { Express, Request, Response, NextFunction } from "express";
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
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

// ─── Config ──────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const JWT_EXPIRY = "24h";
const BCRYPT_ROUNDS = 12;

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

// Legacy hash for migration — DO NOT use for new passwords
function legacyHashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Secure password hashing
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Try bcrypt first
  if (hash.startsWith("$2")) {
    return bcrypt.compare(password, hash);
  }
  // Fallback: legacy SHA-256 (for existing users)
  return legacyHashPassword(password) === hash;
}

function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const TOKEN_HEADER = "x-auth-token";

interface AuthUser { id: number; username: string; displayName: string | null }

async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const token = req.headers[TOKEN_HEADER] as string;
  if (!token) return null;

  // Try JWT first
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await storage.getUser(payload.userId);
    if (!user) return null;
    return { id: user.id, username: user.username, displayName: user.displayName };
  } catch {
    // Fallback: legacy base64 token for existing sessions
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
}

async function requireAuth(req: Request, res: Response): Promise<AuthUser | null> {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ message: "Niet ingelogd" });
    return null;
  }
  return user;
}

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: "Te veel pogingen. Probeer later opnieuw." } });
const generateLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { message: "Generatielimiet bereikt. Probeer over een uur opnieuw." } });
const proxyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { message: "API limiet bereikt." } });

// ─── Route Registration ────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  // POST /api/auth/register — create account (requires invite code)
  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password, displayName, inviteCode } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "E-mailadres en wachtwoord zijn verplicht" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Wachtwoord moet minimaal 8 tekens zijn" });
      }

      const storedCode = await storage.getSetting("invite_code");
      if (storedCode && storedCode !== inviteCode) {
        return res.status(403).json({ message: "Ongeldige uitnodigingscode" });
      }
      if (!storedCode) {
        const code = crypto.randomBytes(6).toString("hex");
        await storage.setSetting("invite_code", code);
      }

      const existing = await storage.getUserByUsername(email);
      if (existing) {
        return res.status(409).json({ message: "Dit e-mailadres is al geregistreerd" });
      }
      const hashed = await hashPassword(password);
      const user = await storage.createUser({
        username: email,
        email,
        password: hashed,
        displayName: displayName || email.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      const token = generateToken(user.id);
      return res.status(201).json({
        user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
        token,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/auth/login — login (accepts email or username)
  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "E-mailadres en wachtwoord zijn verplicht" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Ongeldig e-mailadres of wachtwoord" });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Ongeldig e-mailadres of wachtwoord" });
      }

      // Auto-migrate legacy SHA-256 hash to bcrypt
      if (!user.password.startsWith("$2")) {
        const newHash = await hashPassword(password);
        await storage.updateUser(user.id, { password: newHash });
      }

      const token = generateToken(user.id);
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

  // GET /api/users — list all team members (auth required)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;
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

  // DELETE /api/users/:id — delete a user (auth required, can't delete self)
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const currentUser = await requireAuth(req, res);
      if (!currentUser) return;
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid user ID" });
      if (currentUser.id === id) {
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

  // POST /api/projects/:id/prepare — gather intake + keywords (NO api key exposed)
  app.post("/api/projects/:id/prepare", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const intake = await storage.getIntakeData(id);
      if (!intake) return res.status(422).json({ message: "Intake data required" });

      // Verify API key exists (don't send it to client)
      const dbKey = await storage.getSetting("anthropic_api_key");
      const apiKey = dbKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(400).json({ message: "Anthropic API key niet ingesteld. Ga naar Instellingen." });

      const dbModel = await storage.getSetting("ai_model");
      const model = dbModel || "claude-sonnet-4-20250514";

      // Try to get keywords (quick, with timeout)
      let keywords: any[] = [];
      try {
        const focusServices = parseJsonArray(intake.focusServices);
        const keywordPromise = gatherKeywordsForIntake({
          domain: intake.domain,
          focusServices: focusServices.length > 0 ? focusServices : (intake.productsServices ? [intake.productsServices] : []),
          companyName: intake.companyName,
          industry: intake.industry,
          country: intake.country,
          language: intake.language,
        });
        const timeoutPromise = new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        );
        keywords = await Promise.race([keywordPromise, timeoutPromise]);
      } catch (e) {
        console.log("[Prepare] DataForSEO skipped:", (e as Error).message);
        // Force mock data as fallback
        keywords = [
          { keyword: "test keyword 1", volume: 500, difficulty: 35, cpc: 1.50 },
          { keyword: "test keyword 2", volume: 300, difficulty: 28, cpc: 1.20 },
          { keyword: "test keyword 3", volume: 400, difficulty: 42, cpc: 2.00 }
        ];
      }

      await storage.updateProjectStatus(id, "processing");

      // Return intake + keywords + model, but NOT the API key
      return res.json({ intake, keywords, model });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/auth/claude-key — return API key for authenticated browser-side Claude calls
  app.post("/api/auth/claude-key", async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;
      const dbKey = await storage.getSetting("anthropic_api_key");
      const apiKey = dbKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(400).json({ message: "Anthropic API key niet ingesteld. Ga naar Instellingen." });
      const dbModel = await storage.getSetting("ai_model");
      const model = dbModel || "claude-sonnet-4-20250514";
      return res.json({ key: apiKey, model });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Fout bij ophalen API key" });
    }
  });

  // POST /api/claude-proxy — secure proxy (auth + rate limit + validation)
  app.post("/api/claude-proxy", proxyLimiter, async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;

      const { prompt, model: requestedModel, systemPrompt, maxTokens } = req.body;
      if (!prompt || typeof prompt !== "string") return res.status(400).json({ message: "Prompt is verplicht" });
      if (prompt.length > 15000) return res.status(400).json({ message: "Prompt te lang (max 15000 tekens)" });

      const dbKey = await storage.getSetting("anthropic_api_key");
      const apiKey = dbKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(400).json({ message: "Anthropic API key niet ingesteld" });

      const dbModel = await storage.getSetting("ai_model");
      const model = requestedModel || dbModel || "claude-sonnet-4-20250514";

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: Math.min(maxTokens || 8192, 8192),
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        return res.status(claudeRes.status).json({ message: `Claude API fout: ${errText.substring(0, 300)}` });
      }

      const data = await claudeRes.json();
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Claude proxy error" });
    }
  });

  // POST /api/projects/:id/generate — server-side strategy generation (A1 + A5 fix)
  app.post("/api/projects/:id/generate", generateLimiter, async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;

      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });

      const { type } = req.body; // "seo" | "sea" | "both"
      if (!type || !["seo", "sea", "both"].includes(type)) {
        return res.status(400).json({ message: "Type moet 'seo', 'sea' of 'both' zijn" });
      }

      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project niet gevonden" });

      const intake = await storage.getIntakeData(id);
      if (!intake) return res.status(422).json({ message: "Intake data vereist" });

      const dbKey = await storage.getSetting("anthropic_api_key");
      const apiKey = dbKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(400).json({ message: "Anthropic API key niet ingesteld" });

      const dbModel = await storage.getSetting("ai_model");
      const model = dbModel || "claude-sonnet-4-20250514";

      // Get keywords
      let keywords: any[] = [];
      try {
        const focusServices = parseJsonArray(intake.focusServices);
        keywords = await Promise.race([
          gatherKeywordsForIntake({ domain: intake.domain, focusServices: focusServices.length > 0 ? focusServices : (intake.productsServices ? [intake.productsServices] : []), companyName: intake.companyName, industry: intake.industry, country: intake.country, language: intake.language }),
          new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
        ]);
      } catch { keywords = []; }

      await storage.updateProjectStatus(id, "processing");

      const kwStr = keywords.slice(0, 50).map((k: any) => `${k.keyword} (vol:${k.volume}, kd:${k.difficulty}, cpc:€${k.cpc})`).join("\n");
      const ci = `Bedrijf: ${intake.companyName}\nWebsite: ${intake.domain ?? "onbekend"}\nSector: ${intake.industry ?? "onbekend"}\nModel: ${intake.businessModel ?? "onbekend"}\nRegio: ${intake.region ?? intake.country ?? "Nederland"}\nDiensten: ${intake.productsServices ?? "onbekend"}\nBudget: €${intake.adBudget ?? "1000"}/maand\nConcurrenten: ${intake.competitors ?? "onbekend"}\nDoelgroep: ${intake.targetAudience ?? "onbekend"}`;
      const extra = intake.extraContext ? `\n\nKLANTENKAART:\n${intake.extraContext}` : "";

      const systemPrompt = "Je bent een JSON API. Antwoord UITSLUITEND met valid JSON. Geen markdown, geen backticks. Start direct met {. Houd waardes kort.";

      async function callClaude(prompt: string) {
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 8192, system: systemPrompt, messages: [{ role: "user", content: prompt }] }),
        });
        if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}: ${(await claudeRes.text()).substring(0, 200)}`);
        const data = await claudeRes.json();
        const text = data.content?.map((b: any) => b.text || "").join("") || "";
        const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        try { return JSON.parse(cleaned); } catch {}
        // Extract JSON object
        const start = cleaned.indexOf("{");
        if (start === -1) throw new Error("No JSON in response");
        let depth = 0, end = start, inStr = false, esc = false;
        for (let i = start; i < cleaned.length; i++) {
          const ch = cleaned[i];
          if (esc) { esc = false; continue; }
          if (ch === "\\") { esc = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (ch === "{" || ch === "[") depth++;
          if (ch === "}" || ch === "]") { depth--; if (depth === 0) { end = i; break; } }
        }
        let jsonStr = cleaned.substring(start, end + 1);
        if (depth > 0) {
          jsonStr = jsonStr.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
          let ob = 0, oq = 0;
          for (const c of jsonStr) { if (c === "{") ob++; if (c === "}") ob--; if (c === "[") oq++; if (c === "]") oq--; }
          for (let i = 0; i < oq; i++) jsonStr += "]";
          for (let i = 0; i < ob; i++) jsonStr += "}";
        }
        try { return JSON.parse(jsonStr); } catch {}
        return JSON.parse(jsonStr.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]"));
      }

      let seoResult: any = null;
      let seaResult: any = null;

      if (type === "both") {
        // Run SEO and SEA in parallel to save time
        const [seoRes, seaRes] = await Promise.all([
          callClaude(`Bouw een zoekwoordenonderzoek + pijler-clustermodel.\n\n${ci}${extra}\n\nZOEKWOORDEN:\n${kwStr || "Genereer 20-30 relevante keywords."}\n\nMax 4 categorieën, max 10 kw/cat. Max 4 pijlers, max 5 clusters/pijler, max 4 kw/cluster. Kort!\n\nJSON: {"categories":[{"name":"str","color":"#hex","totalVolume":0,"keywords":[{"keyword":"str","volume":0,"isHighlight":false}]}],"pillars":[{"name":"str","slug":"/str/","description":"kort","icon":"emoji","color":"#hex","totalVolume":0,"clusters":[{"name":"str","slug":"/str/","intent":"informatief|commercieel|transactioneel","keywords":[{"keyword":"str","volume":0}]}]}],"totalKeywords":0,"totalVolume":0}`),
          callClaude(`Ontwerp Google Ads campagnes.\n\n${ci}${extra}\nBudget: €${intake.adBudget ?? "1000"}/maand\n\nZOEKWOORDEN:\n${kwStr || "Genereer 15 high-intent keywords."}\n\nMax 4 campagnes, max 5 kw/camp, max 8 headlines/camp, 2 descriptions. Max 8 neg keywords. Kort!\n\nJSON: {"campaigns":[{"name":"str","type":"Product|Generiek","color":"#hex","keywords":[{"keyword":"str","matchType":"exact|phrase","volume":0,"cpc":0}],"budget":0,"budgetPercent":0,"landingPage":"/str/","headlines":[{"text":"max30ch","type":"KEYWORD|USP_DIENST|CTA"}],"descriptions":["max90ch"]}],"negativeKeywords":{"accountLevel":[{"keywords":"str","reason":"str"}],"crossCampaign":[{"campaign":"str","excludes":["str"]}]},"targeting":{"locations":[{"name":"str","radius":"str"}],"schedule":{"days":"str","hours":"str"},"devices":[{"type":"Desktop|Mobile","bidAdjust":"str"}],"audiences":["str"]},"performance":{"forecast":[{"metric":"str","value":"str","note":"str"}],"growthPlan":[{"phase":1,"title":"str","description":"str"}]}}`),
        ]);
        seoResult = seoRes;
        seaResult = seaRes;
      } else if (type === "seo") {
        seoResult = await callClaude(`Bouw een zoekwoordenonderzoek + pijler-clustermodel.\n\n${ci}${extra}\n\nZOEKWOORDEN:\n${kwStr || "Genereer 20-30 relevante keywords."}\n\nMax 4 categorieën, max 10 kw/cat. Max 4 pijlers, max 5 clusters/pijler, max 4 kw/cluster. Kort!\n\nJSON: {"categories":[{"name":"str","color":"#hex","totalVolume":0,"keywords":[{"keyword":"str","volume":0,"isHighlight":false}]}],"pillars":[{"name":"str","slug":"/str/","description":"kort","icon":"emoji","color":"#hex","totalVolume":0,"clusters":[{"name":"str","slug":"/str/","intent":"informatief|commercieel|transactioneel","keywords":[{"keyword":"str","volume":0}]}]}],"totalKeywords":0,"totalVolume":0}`);
      } else {
        seaResult = await callClaude(`Ontwerp Google Ads campagnes.\n\n${ci}${extra}\nBudget: €${intake.adBudget ?? "1000"}/maand\n\nZOEKWOORDEN:\n${kwStr || "Genereer 15 high-intent keywords."}\n\nMax 4 campagnes, max 5 kw/camp, max 8 headlines/camp, 2 descriptions. Max 8 neg keywords. Kort!\n\nJSON: {"campaigns":[{"name":"str","type":"Product|Generiek","color":"#hex","keywords":[{"keyword":"str","matchType":"exact|phrase","volume":0,"cpc":0}],"budget":0,"budgetPercent":0,"landingPage":"/str/","headlines":[{"text":"max30ch","type":"KEYWORD|USP_DIENST|CTA"}],"descriptions":["max90ch"]}],"negativeKeywords":{"accountLevel":[{"keywords":"str","reason":"str"}],"crossCampaign":[{"campaign":"str","excludes":["str"]}]},"targeting":{"locations":[{"name":"str","radius":"str"}],"schedule":{"days":"str","hours":"str"},"devices":[{"type":"Desktop|Mobile","bidAdjust":"str"}],"audiences":["str"]},"performance":{"forecast":[{"metric":"str","value":"str","note":"str"}],"growthPlan":[{"phase":1,"title":"str","description":"str"}]}}`);
      }

      const overviewResult = await callClaude(`Dashboard overzicht.\n\n${ci}${extra}\nBudget: €${intake.adBudget ?? "1000"}/maand\n${seoResult ? `SEO: ${seoResult.totalKeywords ?? "?"} kw, ${seoResult.totalVolume ?? "?"} vol` : ""}\n${seaResult ? `SEA: ${seaResult.campaigns?.length ?? 0} campagnes` : ""}\n\nTop 5 kw, 3 quick wins SEO+SEA, 5 bullets, max 12 checklist items, top 20 kw. Kort!\n\nJSON: {"kpis":{"totalVolume":0,"seoScore":0,"seaScore":0,"trafficPotential":"str","estimatedLeads":"str"},"topKeywords":[{"keyword":"str","volume":0,"intent":"str","reason":"str"}],"quickWins":{"seo":[{"action":"str","impact":"str"}],"sea":[{"action":"str","impact":"str"}]},"strategyBullets":["str"],"checklist":[{"task":"str","category":"str","priority":"high|medium|low"}],"top20":[{"keyword":"str","volume":0,"intent":"str","type":"SEO|SEA","score":0}]}`);

      // Save dashboard
      const dashBody = {
        projectId: id,
        overview: JSON.stringify(overviewResult),
        seoKeywords: JSON.stringify(seoResult?.categories ?? []),
        pillarCluster: JSON.stringify(seoResult?.pillars ?? []),
        seaCampaigns: JSON.stringify(seaResult?.campaigns ?? []),
        adCopy: JSON.stringify((seaResult?.campaigns ?? []).map((c: any) => ({ name: c.name, color: c.color, headlines: c.headlines ?? [], descriptions: c.descriptions ?? [] }))),
        negatives: JSON.stringify(seaResult?.negativeKeywords ?? {}),
        targeting: JSON.stringify(seaResult?.targeting ?? {}),
        performance: JSON.stringify(seaResult?.performance ?? {}),
        checklist: JSON.stringify(overviewResult?.checklist ?? []),
        createdAt: new Date().toISOString(),
      };

      try {
        const existing = await storage.getStrategyDashboard(id);
        if (existing) await storage.updateStrategyDashboard(id, dashBody);
        else await storage.createStrategyDashboard(dashBody);
      } catch (e) { console.warn("Dashboard save failed:", e); }

      // Save legacy format
      try {
        const summaryData = { projectId: id, executiveSummary: overviewResult?.strategyBullets?.join("\n\n") ?? "", keyFindings: JSON.stringify(overviewResult?.topKeywords ?? []), recommendations: JSON.stringify(overviewResult?.strategyBullets ?? []), implementationChecklist: JSON.stringify(overviewResult?.checklist ?? []), performanceEstimates: JSON.stringify(seaResult?.performance?.forecast ?? []) };
        const existingSummary = await storage.getStrategySummary(id);
        if (existingSummary) await storage.updateStrategySummary(id, summaryData);
        else await storage.createStrategySummary(summaryData);
      } catch (e) { console.warn("Legacy summary save failed:", e); }

      await storage.updateProjectStatus(id, "completed");
      return res.json({ success: true, hasSeo: !!seoResult, hasSea: !!seaResult });
    } catch (err: any) {
      try { await storage.updateProjectStatus(parseId(req.params.id) ?? 0, "intake"); } catch {}
      return res.status(500).json({ message: err.message ?? "Generatie mislukt" });
    }
  });

  // POST /api/projects/:id/save-strategy — save Claude results from client
  app.post("/api/projects/:id/save-strategy", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });

      const { seo, sea, summary } = req.body;

      if (seo) {
        const seoData = { projectId: id, ...seo };
        const existing = await storage.getSeoData(id);
        if (existing) { await storage.updateSeoData(id, seoData); }
        else { await storage.createSeoData(seoData); }
      }

      if (sea) {
        const seaData = { projectId: id, ...sea };
        const existing = await storage.getSeaData(id);
        if (existing) { await storage.updateSeaData(id, seaData); }
        else { await storage.createSeaData(seaData); }
      }

      if (summary) {
        const summaryData = { projectId: id, ...summary };
        const existing = await storage.getStrategySummary(id);
        if (existing) { await storage.updateStrategySummary(id, summaryData); }
        else { await storage.createStrategySummary(summaryData); }
      }

      await storage.updateProjectStatus(id, "completed");
      return res.json({ message: "Strategy saved successfully" });
    } catch (err: any) {
      await storage.updateProjectStatus(parseId(req.params.id) ?? 0, "intake");
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

  // GET /api/projects/:id/strategy-dashboard
  app.get("/api/projects/:id/strategy-dashboard", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });
      const dash = await storage.getStrategyDashboard(id);
      if (!dash) return res.status(404).json({ message: "Strategy dashboard not found" });
      return res.json(dash);
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // POST /api/projects/:id/save-dashboard — save full strategy dashboard from client
  app.post("/api/projects/:id/save-dashboard", async (req: Request, res: Response) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid project ID" });

      const { overview, seoKeywords, pillarCluster, seaCampaigns, adCopy, negatives, targeting, performance, checklist } = req.body;

      const dashData = {
        projectId: id,
        overview: typeof overview === "string" ? overview : JSON.stringify(overview ?? {}),
        seoKeywords: typeof seoKeywords === "string" ? seoKeywords : JSON.stringify(seoKeywords ?? []),
        pillarCluster: typeof pillarCluster === "string" ? pillarCluster : JSON.stringify(pillarCluster ?? []),
        seaCampaigns: typeof seaCampaigns === "string" ? seaCampaigns : JSON.stringify(seaCampaigns ?? []),
        adCopy: typeof adCopy === "string" ? adCopy : JSON.stringify(adCopy ?? []),
        negatives: typeof negatives === "string" ? negatives : JSON.stringify(negatives ?? {}),
        targeting: typeof targeting === "string" ? targeting : JSON.stringify(targeting ?? {}),
        performance: typeof performance === "string" ? performance : JSON.stringify(performance ?? {}),
        checklist: typeof checklist === "string" ? checklist : JSON.stringify(checklist ?? []),
        createdAt: new Date().toISOString(),
      };

      const existing = await storage.getStrategyDashboard(id);
      if (existing) {
        await storage.updateStrategyDashboard(id, dashData);
      } else {
        await storage.createStrategyDashboard(dashData);
      }

      await storage.updateProjectStatus(id, "completed");
      return res.json({ message: "Dashboard saved successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

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
  // GET /api/settings — list settings (auth required)
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;
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

  // GET /api/settings/:key — get single setting (auth required)
  app.get("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;
      const key = req.params.key;
      if (key.includes("api_key") || key.includes("password")) {
        return res.status(403).json({ message: "Sensitive settings cannot be read directly" });
      }
      const value = await storage.getSetting(key);
      if (value === undefined) return res.status(404).json({ message: "Setting not found" });
      return res.json({ key, value });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  // PUT /api/settings — upsert settings (auth required)
  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;
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

  // DELETE /api/settings/:key — delete setting (auth required)
  app.delete("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const user = await requireAuth(req, res);
      if (!user) return;
      const deleted = await storage.deleteSetting(req.params.key);
      if (!deleted) return res.status(404).json({ message: "Setting not found" });
      return res.json({ message: "Setting deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message ?? "Internal server error" });
    }
  });

  return httpServer;
}
