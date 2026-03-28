// Load environment variables BEFORE importing server
import dotenv from 'dotenv';
dotenv.config();

import { defineConfig, Plugin, searchForWorkspaceRoot } from "vite"; // 1. Add searchForWorkspaceRoot here
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envPrefix: ['VITE_', 'MEHFIL_'],
  server: {
    host: "0.0.0.0",
    port: 8080,
    fs: {
      // 2. Change 'allow' to this:
      allow: [
        searchForWorkspaceRoot(process.cwd()), // Allows serving files from the project root
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("react/") ||
            id.includes("react-dom/") ||
            id.includes("react-router-dom/")
          ) {
            return "vendor";
          }

          // DO NOT manually chunk recharts or its dependencies (d3-*, react-smooth, etc).
          // Recharts has circular internal dependencies. Rollup's default algorithm
          // resolves the initialization order correctly, but manualChunks breaks it,
          // causing: "ReferenceError: Cannot access 'X' before initialization"

          if (id.includes("@emoji-mart/")) {
            return "emoji";
          }

          if (id.includes("socket.io-client/")) {
            return "socket";
          }
        },
      },
    },
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    async configureServer(server) {
      const { createServer } = await import("./server");
      const { app, io, httpServer } = await createServer();

      // Attach Socket.IO to Vite's HTTP server
      io.attach(server.httpServer!);

      server.middlewares.use(app);
    },
  };
}
