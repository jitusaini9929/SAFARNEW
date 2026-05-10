// ═══════════════════════════════════════════════════════════════════════════
// SCALABILITY FIX #1 — PERSISTENT SESSION STORE (connect-pg-simple)
// ═══════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FIXES:
//   The default express-session MemoryStore keeps all sessions in RAM.
//   At 5000 users, this leaks memory and crashes the server. Also, a server
//   restart logs out every user.
//
// HOW TO ACTIVATE:
//   1. Run: pnpm add connect-pg-simple
//   2. Copy this file over server/index.ts (backup the original first)
//   3. The session table is auto-created on first run.
//
// WHAT CHANGES vs original server/index.ts:
//   - Added: import connectPgSimple + pool import
//   - Changed: session() now uses `store: new PgStore(...)` instead of MemoryStore
//   - Everything else is IDENTICAL to the original file.
// ═══════════════════════════════════════════════════════════════════════════

import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { handleDemo } from "./routes/demo";
import { authRoutes } from "./routes/auth";
import { moodRoutes } from "./routes/moods";
import { journalRoutes } from "./routes/journal";
import { goalRoutes } from "./routes/goals";
import { streakRoutes } from "./routes/streaks";
import { focusSessionRoutes } from "./routes/focus-sessions";
import { achievementRoutes, seedAchievementDefinitions } from "./routes/achievements";
import { initDatabase, fixAchievementSchema } from "./db";
import { setupMehfilSocket } from "./routes/mehfil-socket";
import { paymentRoutes } from "./routes/payments";
import { uploadRoutes, imageServeRouter } from "./routes/uploads";
import { mehfilInteractionsRouter } from "./routes/mehfil-interactions";
import mehfilSocialRouter from "./routes/mehfil-social";

// ──── SCALABILITY: Persistent session store ────
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

export async function createServer() {
  const app = express();

  // Initialize DB (async for Turso)
  await initDatabase();
  await fixAchievementSchema();

  // Seed achievement definitions
  await seedAchievementDefinitions();
  const { seedPerkDefinitions } = await import("./routes/perks");
  await seedPerkDefinitions();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // ──── SCALABILITY: PostgreSQL-backed session store ────
  // Sessions survive server restarts, RAM stays flat regardless of user count,
  // and multiple server instances can share the same session data.
  const PgStore = connectPgSimple(session);

  // Trust proxy for Render/Heroku deployments
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      // ──── THIS IS THE KEY CHANGE ────
      store: new PgStore({
        pool: pool,                    // Reuse existing Neon connection pool
        tableName: "user_sessions",    // Table name in PostgreSQL
        createTableIfMissing: true,    // Auto-creates the table on first run
        pruneSessionInterval: 60 * 15, // Clean expired sessions every 15 min
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
      name: "nistha.sid",
    })
  );

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/moods", moodRoutes);
  app.use("/api/journal", journalRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/streaks", streakRoutes);
  app.use("/api/focus-sessions", focusSessionRoutes);
  app.use("/api/achievements", achievementRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/images", imageServeRouter);
  app.use("/api/mehfil/interactions", mehfilInteractionsRouter);
  app.use("/api/mehfil", mehfilSocialRouter);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Create HTTP server and Socket.IO
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  // Setup Mehfil Socket.IO handlers
  setupMehfilSocket(io);

  return { app, httpServer, io };
}
