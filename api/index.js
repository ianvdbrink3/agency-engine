import express from "express";
import { registerRoutes } from "../server/routes.js";
import { createServer } from "http";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;
let httpServer;

async function init() {
  if (initialized) return;
  httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  initialized = true;
}

const handler = async (req, res) => {
  await init();
  return app(req, res);
};

export default handler;
