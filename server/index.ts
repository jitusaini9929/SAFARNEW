import "./load-env";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { createServer as createHttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { handleDemo } from "./routes/demo";
import { moodRoutes } from "./routes/moods";
import { journalRoutes } from "./routes/journal";
import { goalRoutes } from "./routes/goals";
import { streakRoutes } from "./routes/streaks";
import { focusSessionRoutes } from "./routes/focus-sessions";
import { ekagraSessionRoutes } from "./routes/ekagra-sessions";
import { focusOverlayRoutes } from "./routes/focus-overlay";
import { analyticsRoutes } from "./routes/analytics";
import { connectMongo, initDatabase } from "./db";
import { setupMehfilSocket } from "./routes/mehfil-socket";
import { paymentRoutes } from "./routes/payments";
import { uploadRoutes, imageServeRouter } from "./routes/uploads";
import { syllabusImportRoutes } from "./routes/syllabus-import";
import { mehfilInteractionRoutes } from "./routes/mehfil-interactions";
import mehfilSocialRouter from "./routes/mehfil-social";
import { dmRoutes } from "./routes/dm";
import { getRedisClient } from "./lib/redis.client";
import { missionRouter } from "./routes/mission";
import { notificationRoutes } from "./routes/notifications";
import { liveSessionRoutes } from "./routes/live-sessions";
import { suggestionBoxRoutes } from "./routes/suggestion-box";
import { wishboxRoutes } from "./temporaryFeatures/birthdayWishBox/wishbox.routes";
import { wishboxAdminRoutes } from "./temporaryFeatures/birthdayWishBox/wishbox.admin.routes";
import { startWishboxWorker } from "./temporaryFeatures/birthdayWishBox/wishbox.worker";
import { startNotificationScheduler } from "./services/notification-scheduler";

// Setup Mehfil Socket.IO Config Constants
// Redis adapter logic moved down

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadStartupModule<T>(label: string, loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.error(`[STARTUP] Failed to load ${label}:`, error);
    throw error;
  }
}

async function runStartupTask(label: string, task: () => Promise<void>): Promise<void> {
  try {
    console.log(`[STARTUP] ${label}...`);
    await task();
    console.log(`[STARTUP] ${label} complete`);
  } catch (error) {
    console.error(`[STARTUP] ${label} failed:`, error);
    throw error;
  }
}

export async function createServer() {
  const app = express();
  const legacyUploadBase = process.env.UPLOAD_DIR || path.resolve(__dirname, "../../uploads");

  // Connect MongoDB first
  await runStartupTask("connect MongoDB", async () => {
    await connectMongo();
  });
  await runStartupTask("initialize MongoDB indexes", async () => {
    await initDatabase();
  });

  const achievementsModule = await loadStartupModule("achievement routes", () => import("./routes/achievements"));
  const perksModule = await loadStartupModule("perk routes", () => import("./routes/perks"));
  const authModule = await loadStartupModule("auth routes", () => import("./routes/auth"));
  const planModule = await loadStartupModule("study planner routes", () => import("../client/features/study-planner/plan.routes"));
  const sandeshModule = await loadStartupModule("sandesh routes", () => import("./routes/sandesh"));
  const suggestionsModule = await loadStartupModule("suggestions routes", () => import("./routes/suggestions"));

  const IS_DEV_MODE = process.env.DEV_MODE === 'true';

  if (!IS_DEV_MODE) {
    await runStartupTask("seed achievement definitions", async () => {
      await achievementsModule.seedAchievementDefinitions();
    });
    await runStartupTask("seed perk definitions", async () => {
      await perksModule.seedPerkDefinitions();
    });
  } else {
    console.log('[STARTUP] DEV MODE — skipping seed tasks');
  }


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
      limit: "10mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  // Key by the access token (hashed) for authenticated requests so users behind
  // shared carrier-grade NAT (mobile networks) don't share a single 400/min
  // budget. Falls back to req.ip for unauthenticated traffic. This was the root
  // cause of "Too many requests" toasts on the Android Study Planner: opening a
  // freshly-created plan fires getPlan + calendar + analytics back-to-back, and
  // on a 5G/CGN IP every Safar user on the same gateway was sharing one bucket.
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute window
    max: 400,                   // max requests per window per user (or per IP for anon)
    standardHeaders: true,      // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,       // Disable `X-RateLimit-*` headers
    message: { message: "Too many requests, please try again later." },
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      if (typeof auth === "string" && auth.startsWith("Bearer ")) {
        const token = auth.slice(7).trim();
        if (token) {
          // Hash the token so we don't keep raw access tokens in the limiter's
          // in-memory map. Truncated SHA-256 is plenty unique for bucketing.
          return "u:" + crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
        }
      }
      return ipKeyGenerator(req.ip || "unknown");
    },
    // Authenticated plan creation from template is one intentional action; skipping avoids 429 UX when global IP budget is tight.
    skip: (req) =>
      req.method === "POST" &&
      (req.path === "/api/plans/from-template" || req.originalUrl.startsWith("/api/plans/from-template")),
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
  app.use("/api/auth", authModule.authRoutes);
  app.use("/api/moods", moodRoutes);
  app.use("/api/journal", journalRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/streaks", streakRoutes);
  app.use("/api/focus-sessions", focusSessionRoutes);
  app.use("/api/ekagra-sessions", ekagraSessionRoutes);
  app.use("/api/focus-overlay", focusOverlayRoutes);
  app.use("/api/achievements", achievementsModule.achievementRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/syllabus", syllabusImportRoutes);
  app.use("/api/images", imageServeRouter);
  app.use("/api/mehfil/interactions", mehfilInteractionRoutes);
  app.use("/api/mehfil/sandesh", sandeshModule.sandeshRoutes);
  app.use("/api/mehfil", mehfilSocialRouter);
  app.use("/api/dm", dmRoutes);
  app.use("/api/plans", planModule.default);
  app.use("/api/suggestions", suggestionsModule.suggestionsRoutes);
  app.use("/api/suggestion-box", suggestionBoxRoutes);
  app.use("/api/mission", missionRouter);
  app.use("/api", notificationRoutes);
  app.use("/api/live-sessions", liveSessionRoutes);
  app.use("/api/wishbox", wishboxRoutes);
  app.use("/api/admin/wishbox", wishboxAdminRoutes);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/health/redis", async (_req, res) => {
    const client = getRedisClient();
    if (!client) {
      return res.status(200).json({ redis: "disabled" });
    }

    try {
      const pong = await client.ping();
      return res.json({ redis: pong });
    } catch (error) {
      return res.status(500).json({ redis: "down" });
    }
  });

  app.get("/api/demo", handleDemo);

  startWishboxWorker();
  startNotificationScheduler();


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

  // Configure the Redis adapter only when Redis is available at runtime.
  const { getRedisClient: getTokenStoreRedis } = await import("./lib/token.store");
  void getTokenStoreRedis()
    .then(async (redis) => {
      if (!redis) {
        console.warn("[SOCKET.IO] Redis unavailable, running without the Redis adapter");
        return;
      }

      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);

      const originalPublish = pubClient.publish.bind(pubClient);
      (pubClient as any).publish = async (...args: any[]) => {
        try {
          return await originalPublish(...args);
        } catch (error: any) {
          const isClosedClient =
            error?.name === "ClientClosedError" ||
            /client is closed/i.test(String(error?.message || ""));

          if (isClosedClient) {
            console.warn("[SOCKET.IO] Redis pub client closed, skipping cross-instance publish for this event");
            return 0;
          }

          throw error;
        }
      };

      pubClient.on("error", (error) => {
        console.error("[SOCKET.IO] Redis pub client error:", error);
      });

      subClient.on("error", (error) => {
        console.error("[SOCKET.IO] Redis sub client error:", error);
      });

      io.adapter(createAdapter(pubClient, subClient));
      console.log("[SOCKET.IO] Redis adapter configured for multi-instance scaling");
    })
    .catch((error) => {
      console.error("[SOCKET.IO] Redis adapter setup failed:", error);
    });

  return { app, httpServer, io };
}
