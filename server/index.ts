import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import { createServer as createHttpServer } from "http";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { handleDemo } from "./routes/demo";
import { authRoutes } from "./routes/auth";
import { moodRoutes } from "./routes/moods";
import { journalRoutes } from "./routes/journal";
import { goalRoutes } from "./routes/goals";
import { streakRoutes } from "./routes/streaks";
import { focusSessionRoutes } from "./routes/focus-sessions";
import { achievementRoutes, seedAchievementDefinitions } from "./routes/achievements";
import { connectMongo, initDatabase } from "./db";
import { setupMehfilSocket } from "./routes/mehfil-socket";
import { paymentRoutes } from "./routes/payments";
import { uploadRoutes, imageServeRouter } from "./routes/uploads";
import { mehfilInteractionRoutes } from "./routes/mehfil-interactions";
import mehfilSocialRouter from "./routes/mehfil-social";

async function createRedisSessionStore() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
  const redisRequired = process.env.REDIS_REQUIRED === "true";
  if (!redisUrl) {
    if (redisRequired) {
      throw new Error("REDIS_REQUIRED is true but REDIS_URL is not set");
    }
    return null;
  }

  try {
    const redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10000),
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis client error:", error);
    });

    await redisClient.connect();
    console.log("✅ Redis connected for session store");

    const store = new RedisStore({
      client: redisClient,
      prefix: process.env.REDIS_SESSION_PREFIX || "nistha:sess:",
    });

    return { store, redisClient };
  } catch (error) {
    if (redisRequired) {
      throw new Error(`Redis connection failed while REDIS_REQUIRED=true: ${String(error)}`);
    }
    console.error("⚠️ Redis unavailable, falling back to MemoryStore:", error);
    return null;
  }
}

export async function createServer() {
  const app = express();

  // Connect MongoDB first
  await connectMongo();
  await initDatabase();

  // Seed definitions
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

  // Session Setup (using memory store - sessions reset on server restart)
  // For production with multiple instances, consider using redis or a DB-backed store

  // Trust proxy for Render/Heroku deployments
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const redisSession = await createRedisSessionStore();

  app.use(
    session({
      store: redisSession?.store || undefined,
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

  if (!redisSession) {
    console.warn("⚠️ Using in-memory session store (not recommended for production)");
  }

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
  app.use("/api/mehfil/interactions", mehfilInteractionRoutes);
  app.use("/api/mehfil", mehfilSocialRouter);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Create HTTP server and Socket.IO
  const httpServer = createHttpServer(app);

  // Setup Mehfil Socket.IO handlers
  const io = setupMehfilSocket(httpServer);

  return { app, httpServer, io };
}

