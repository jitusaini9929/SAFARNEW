import path from "path";
import { createServer } from "./index";
import * as express from "express";

// Build timestamp: 2026-02-01T09:36 - Force fresh build
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// Start server with async initialization
async function startServer() {
  const { app, httpServer } = await createServer();

  // IMPORTANT: Static files and catch-all route must come AFTER API routes
  // API routes are already registered in createServer()

  // Serve static files
  app.use(express.static(distPath));

  // Handle React Router - serve index.html for all non-API routes
  // This MUST be the last route registered
  // Express 5 requires named param or regex, not bare *
  app.get("/{*splat}", (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api/") || req.path.startsWith("/health") || req.path.startsWith("/socket.io")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
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
