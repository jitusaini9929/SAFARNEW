import "./load-env";
import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { createServer as createHttpServer } from "http";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { handleDemo } from "./routes/demo";
import { authRoutes } from "./routes/auth";
import { moodRoutes } from "./routes/moods";
import { journalRoutes } from "./routes/journal";
import { goalRoutes } from "./routes/goals";
import { streakRoutes } from "./routes/streaks";
import { focusSessionRoutes } from "./routes/focus-sessions";
import { focusOverlayRoutes } from "./routes/focus-overlay";
import { achievementRoutes, seedAchievementDefinitions } from "./routes/achievements";
import { analyticsRoutes } from "./routes/analytics";
import { connectMongo, initDatabase } from "./db";
import { setupMehfilSocket } from "./routes/mehfil-socket";
import { paymentRoutes } from "./routes/payments";
import { uploadRoutes, imageServeRouter } from "./routes/uploads";
import { mehfilInteractionRoutes } from "./routes/mehfil-interactions";
import mehfilSocialRouter from "./routes/mehfil-social";
import { dmRoutes } from "./routes/dm";

// Setup Mehfil Socket.IO Config Constants
// Redis adapter logic moved down

export async function createServer() {
  const app = express();
  const legacyUploadBase = process.env.UPLOAD_DIR || path.resolve(__dirname, "../../uploads");

  // Connect MongoDB first
  await connectMongo();
  await initDatabase();

  // Seed definitions
  await seedAchievementDefinitions();
  const { seedPerkDefinitions } = await import("./routes/perks");
  await seedPerkDefinitions();


  // Performance: gzip/brotli compression
  app.use(compression());

  // Security headers (relaxed CSP to allow Vite dev & inline styles)
  app.use(helmet({
    contentSecurityPolicy: false, // Vite uses inline scripts; enable in prod with proper policy
    crossOriginEmbedderPolicy: false, // Allow loading external fonts & images
  }));

  // Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(
    express.json({
      limit: "50mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // ── Serve uploaded files from disk with cache headers ──
  // In production on VPS, Nginx should serve /uploads/ directly for better performance.
  // This Express static middleware is the fallback / dev-mode server.
  app.use('/uploads', express.static(legacyUploadBase, {
    maxAge: '30d',
    immutable: true,
    etag: true,
    lastModified: true,
  }));

  // Session Setup (using memory store - sessions reset on server restart)
  // For production with multiple instances, consider using redis or a DB-backed store

  // Trust proxy for Render/Heroku deployments
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // ── Rate Limiting (100 requests per minute per IP) ──
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute window
    max: 100,                   // max 100 requests per window
    standardHeaders: true,      // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,       // Disable `X-RateLimit-*` headers
    message: { message: "Too many requests, please try again later." },
  });
  app.use("/api/", apiLimiter);

  // ── CSRF Protection (PAUSED) ──
  // Temporarily disabled to resolve UX issues with token mismatches.
  // To re-enable, uncomment the block below.
  /*
  app.get("/api/csrf-token", (req, res) => {
    const token = crypto.randomBytes(32).toString("hex");
    (req.session as any).csrfToken = token;
    res.cookie("XSRF-TOKEN", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ csrfToken: token });
  });

  app.use("/api/", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (req.path.startsWith("/auth/")) return next();

    const headerToken = req.headers["x-csrf-token"] as string;
    const sessionToken = (req.session as any)?.csrfToken;

    if (!headerToken || !sessionToken || headerToken !== sessionToken) {
      return res.status(403).json({ message: "Invalid or missing CSRF token." });
    }
    return next();
  });
  */

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/moods", moodRoutes);
  app.use("/api/journal", journalRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/streaks", streakRoutes);
  app.use("/api/focus-sessions", focusSessionRoutes);
  app.use("/api/focus-overlay", focusOverlayRoutes);
  app.use("/api/achievements", achievementRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/images", imageServeRouter);
  app.use("/api/mehfil/interactions", mehfilInteractionRoutes);
  app.use("/api/mehfil/sandesh", (await import("./routes/sandesh")).sandeshRoutes);
  app.use("/api/mehfil", mehfilSocialRouter);
  app.use("/api/dm", dmRoutes);
  app.use("/api/suggestions", (await import("./routes/suggestions")).suggestionsRoutes);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);


  // Create HTTP server and Socket.IO
  const httpServer = createHttpServer(app);

  const MEHFIL_PAUSED = false;
  const MEHFIL_PAUSED_MESSAGE = "Due to irrelevant and spam posts . Mehfil is currently not accessible . We are working on it and notify shortly";

  // Setup Mehfil Socket.IO handlers
  const io = setupMehfilSocket(httpServer, {
    paused: MEHFIL_PAUSED,
    pausedMessage: MEHFIL_PAUSED_MESSAGE,
    redisClient: null, // Redis logic handled in token.store.ts now, but passing null for socket auth since we'll upgrade it
  });

  // Simplified Redis adapter - uses the redis from token.store
  const { redis } = await import("./lib/token.store");
  if (redis) {
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[SOCKET.IO] Redis adapter configured for multi-instance scaling");
  }

  return { app, httpServer, io };
}
