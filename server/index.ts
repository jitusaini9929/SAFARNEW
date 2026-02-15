import "./load-env";
import express from "express";
import cors from "cors";
import session, { type SessionData } from "express-session";
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
import { focusOverlayRoutes } from "./routes/focus-overlay";
import { achievementRoutes, seedAchievementDefinitions } from "./routes/achievements";
import { connectMongo, initDatabase } from "./db";
import { setupMehfilSocket } from "./routes/mehfil-socket";
import { paymentRoutes } from "./routes/payments";
import { uploadRoutes, imageServeRouter } from "./routes/uploads";
import { mehfilInteractionRoutes } from "./routes/mehfil-interactions";
import mehfilSocialRouter from "./routes/mehfil-social";

type SessionStoreCallback = (err?: unknown, data?: unknown) => void;
type SessionRedisClient = ReturnType<typeof createClient>;
const MEHFIL_PAUSED = false;
const MEHFIL_PAUSED_MESSAGE = "Due to irrelevant and spam posts . Mehfil is currently not accessible . We are working on it and notify shortly";

const RETRYABLE_REDIS_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "NR_CLOSED",
  "NR_CONNECTION_LOST",
]);

function optionalStoreCb(err: unknown, data: unknown, cb?: SessionStoreCallback) {
  if (cb) return cb(err, data);
  if (err) throw err;
  return data;
}

function getRedisErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const maybeCode = (error as { code?: unknown }).code;
  return typeof maybeCode === "string" ? maybeCode : undefined;
}

function isRetryableRedisError(error: unknown): boolean {
  const code = getRedisErrorCode(error);
  if (code && RETRYABLE_REDIS_ERROR_CODES.has(code)) return true;

  const message = String(
    (error as { message?: unknown } | undefined)?.message ?? error,
  ).toLowerCase();

  return (
    message.includes("econnreset") ||
    message.includes("socket closed unexpectedly") ||
    message.includes("the client is closed") ||
    message.includes("connection is closed") ||
    message.includes("connection timeout") ||
    message.includes("read econnreset")
  );
}

function maskSessionId(sid: string): string {
  if (!sid) return "unknown";
  if (sid.length <= 8) return sid;
  return `${sid.slice(0, 8)}...`;
}

async function reconnectRedisClient(redisClient: SessionRedisClient) {
  if (redisClient.isReady) return;

  try {
    await redisClient.connect();
  } catch (error) {
    const message = String((error as { message?: unknown })?.message ?? error);
    if (!/already open|socket already opened/i.test(message)) {
      throw error;
    }
  }

  if (!redisClient.isReady) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

class ResilientRedisStore extends RedisStore {
  private readonly redisClient: SessionRedisClient;

  constructor(redisClient: SessionRedisClient, options: ConstructorParameters<typeof RedisStore>[0]) {
    super(options);
    this.redisClient = redisClient;
  }

  private sessionTtl(sess: SessionData): number {
    if (typeof this.ttl === "function") return this.ttl(sess);

    if (sess?.cookie?.expires) {
      const ms = Number(new Date(sess.cookie.expires)) - Date.now();
      return Math.ceil(ms / 1000);
    }

    return this.ttl;
  }

  private async runWithRetry<T>(operation: string, sid: string, command: () => Promise<T>): Promise<T> {
    try {
      return await command();
    } catch (error) {
      if (!isRetryableRedisError(error)) throw error;

      const code = getRedisErrorCode(error) ?? "UNKNOWN";
      console.warn(
        `[SESSION][REDIS] ${operation} failed for sid=${maskSessionId(sid)} code=${code}. Retrying once.`,
      );

      await reconnectRedisClient(this.redisClient);
      return command();
    }
  }

  async get(sid: string, cb?: SessionStoreCallback) {
    const key = this.prefix + sid;

    try {
      const data = await this.runWithRetry("GET", sid, () => this.client.get(key));
      if (!data) return optionalStoreCb(null, null, cb);
      return optionalStoreCb(null, await this.serializer.parse(data), cb);
    } catch (error) {
      return optionalStoreCb(error, null, cb);
    }
  }

  async set(sid: string, sess: SessionData, cb?: SessionStoreCallback) {
    const key = this.prefix + sid;
    const ttl = this.sessionTtl(sess);

    try {
      if (ttl <= 0) return this.destroy(sid, cb);

      const value = this.serializer.stringify(sess);
      await this.runWithRetry("SET", sid, async () => {
        if (this.disableTTL) await this.client.set(key, value);
        else await this.client.set(key, value, ttl);
      });

      return optionalStoreCb(null, null, cb);
    } catch (error) {
      return optionalStoreCb(error, null, cb);
    }
  }

  async touch(sid: string, sess: SessionData, cb?: SessionStoreCallback) {
    const key = this.prefix + sid;

    if (this.disableTouch || this.disableTTL) {
      return optionalStoreCb(null, null, cb);
    }

    try {
      await this.runWithRetry("TOUCH", sid, () => this.client.expire(key, this.sessionTtl(sess)));
      return optionalStoreCb(null, null, cb);
    } catch (error) {
      return optionalStoreCb(error, null, cb);
    }
  }

  async destroy(sid: string, cb?: SessionStoreCallback) {
    const key = this.prefix + sid;

    try {
      await this.runWithRetry("DESTROY", sid, () => this.client.del([key]));
      return optionalStoreCb(null, null, cb);
    } catch (error) {
      return optionalStoreCb(error, null, cb);
    }
  }
}

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
      pingInterval: Number(process.env.REDIS_PING_INTERVAL_MS || 10000),
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10000),
        keepAlive: Number(process.env.REDIS_KEEP_ALIVE_MS || 10000),
        noDelay: true,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    redisClient.on("ready", () => {
      console.log("[SESSION][REDIS] client ready");
    });

    redisClient.on("reconnecting", () => {
      console.warn("[SESSION][REDIS] reconnecting...");
    });

    redisClient.on("end", () => {
      console.warn("[SESSION][REDIS] connection closed");
    });

    redisClient.on("error", (error) => {
      const code = getRedisErrorCode(error);
      const message = String((error as { message?: unknown })?.message ?? error);
      console.error(`[SESSION][REDIS] client error${code ? ` (${code})` : ""}: ${message}`);
    });

    await redisClient.connect();
    console.log("[SESSION][REDIS] connected for session store");

    const store = new ResilientRedisStore(redisClient, {
      client: redisClient,
      prefix: process.env.REDIS_SESSION_PREFIX || "nistha:sess:",
    });

    return { store, redisClient };
  } catch (error) {
    if (redisRequired) {
      throw new Error(`Redis connection failed while REDIS_REQUIRED=true: ${String(error)}`);
    }

    console.error("[SESSION][REDIS] unavailable, falling back to MemoryStore:", error);
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
    console.warn("[SESSION][MEMORY] using in-memory store (not recommended for production)");
  }

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/moods", moodRoutes);
  app.use("/api/journal", journalRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/streaks", streakRoutes);
  app.use("/api/focus-sessions", focusSessionRoutes);
  app.use("/api/focus-overlay", focusOverlayRoutes);
  app.use("/api/achievements", achievementRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/images", imageServeRouter);
  app.use("/api/mehfil/interactions", mehfilInteractionRoutes);
  app.use("/api/mehfil/sandesh", (await import("./routes/sandesh")).sandeshRoutes);
  app.use("/api/mehfil", mehfilSocialRouter);

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Convert transient Redis session transport failures into a controlled response.
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isRetryableRedisError(err)) return next(err);

    const message = String((err as { message?: unknown })?.message ?? err);
    console.error("[SESSION][REDIS] request failed after retry:", message);

    if (res.headersSent) return next(err);
    return res.status(503).json({ message: "Session service is temporarily unavailable. Please retry." });
  });

  // Create HTTP server and Socket.IO
  const httpServer = createHttpServer(app);

  // Setup Mehfil Socket.IO handlers
  const io = setupMehfilSocket(httpServer, {
    paused: MEHFIL_PAUSED,
    pausedMessage: MEHFIL_PAUSED_MESSAGE,
  });

  return { app, httpServer, io };
}

