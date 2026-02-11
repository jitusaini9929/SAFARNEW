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
import { initDatabase } from "./db";
import { setupMehfilSocket } from "./routes/mehfil-socket";
import { paymentRoutes } from "./routes/payments";

export async function createServer() {
  const app = express();

  // Initialize DB (async for Turso)
  await initDatabase();

  // Seed achievement definitions
  await seedAchievementDefinitions();

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Session Setup (using memory store - sessions reset on server restart)
  // For production with multiple instances, consider using redis or a DB-backed store

  // Trust proxy for Render/Heroku deployments
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
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

