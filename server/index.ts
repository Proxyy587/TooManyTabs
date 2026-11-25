import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "node:http";

import authRoutes from "./routes/auth.js";
import syncRoutes from "./routes/sync.js";
import deviceRoutes from "./routes/device.js";
import { googleConfig } from "./lib/google.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(
  cors({
    // Only extension pages/workers talk to this API.
    origin: (origin, cb) => cb(null, !origin || origin.startsWith("chrome-extension://")),
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "TooManyTabs API", version: "2.0.0" });
});

app.get("/health", (_req: Request, res: Response) => {
  const g = googleConfig();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "configured" : "not configured",
    jwt: process.env.JWT_SECRET ? "configured" : "not configured",
    auth: {
      getAuthToken: g.accessTokenLogin ? "ready" : "missing GOOGLE_EXTENSION_CLIENT_ID",
      launchWebAuthFlow: g.codeLogin ? "ready" : "missing GOOGLE_WEB_CLIENT_ID / GOOGLE_WEB_CLIENT_SECRET",
    },
  });
});

app.use("/auth", authRoutes);
app.use("/sync", syncRoutes);
app.use("/device", deviceRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const server = http.createServer(app);

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[server] Port ${PORT} is already in use.`);
    console.error(`[server] Free it with:  lsof -tiTCP:${PORT} -sTCP:LISTEN | xargs kill`);
    console.error(`[server] Or use another port:  PORT=3001 bun run dev`);
  } else {
    console.error("[server] Failed to start:", err);
  }
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[server] TooManyTabs listening on http://127.0.0.1:${PORT}`);
  console.log(`[server] Health: http://127.0.0.1:${PORT}/health`);
  const g = googleConfig();
  console.log(
    `[server] Auth: getAuthToken ${g.accessTokenLogin ? "ready" : "OFF"} · launchWebAuthFlow ${g.codeLogin ? "ready" : "OFF"}`
  );
  console.log(`[server] Press Ctrl+C to stop`);
  if (!process.env.DATABASE_URL) console.warn("[server] DATABASE_URL is not set");
  if (!process.env.JWT_SECRET) console.warn("[server] JWT_SECRET is not set");
  else if (process.env.JWT_SECRET.length < 32) {
    console.warn("[server] JWT_SECRET is shorter than 32 characters. Generate one: openssl rand -base64 48");
  }
});

function shutdown(signal: string) {
  console.log(`\n[server] ${signal} received — shutting down…`);
  server.close(() => process.exit(0));
  // Force-exit if connections hang (keeps Ctrl+C snappy)
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
