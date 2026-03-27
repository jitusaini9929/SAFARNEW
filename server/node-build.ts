import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index";
import * as express from "express";

// Build timestamp: 2026-02-01T09:36 - Force fresh build
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../spa");

// Start server with async initialization
async function startServer() {
  const { app, httpServer } = await createServer();

  // IMPORTANT: Static files and catch-all route must come AFTER API routes
  // API routes are already registered in createServer()

  // ── Static Asset Caching (biggest bandwidth reduction) ──
  // Vite hashed assets (e.g. /assets/index-a1b2c3.js) — safe to cache forever
  // because the hash changes when the file changes.
  app.use('/assets', express.static(path.join(distPath, 'assets'), {
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true,
  }));

  // All other static files (favicon, manifest, etc.) — 1 day cache
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    index: false, // Don't auto-serve index.html from here — handled below with custom headers
  }));

  // Handle React Router — serve index.html for all non-API routes
  // Must use no-cache so browsers always revalidate, but ETag gives efficient 304s
  // Express 5 requires named param or regex, not bare *
  app.get("/{*splat}", (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/") || req.path.startsWith("/health") || req.path.startsWith("/socket.io")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, "index.html"));
  });

  // Use httpServer.listen for Socket.IO support
  httpServer.listen(port, () => {
    console.log(`🚀 Nistha server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
    console.log(`🔌 Mehfil Socket.IO: ws://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
