import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import type { Request, Response, NextFunction } from "express";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;

async function init() {
  if (initialized) return;
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  initialized = true;
}

export default async function handler(req: Request, res: Response) {
  await init();
  return app(req as any, res as any);
}
