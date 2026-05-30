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
    host: "::",
    port: 8080,
    headers: {
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
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
    commonjsOptions: {
      // victory-vendor (used by recharts) mixes CJS and ESM syntax.
      // Without this, Rollup's CJS→ESM transform can generate code where a
      // `const` is referenced before its initializer runs (TDZ error).
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Rollup 4 defaults constBindings to `true` (uses `const` for
        // generated re-export wrappers). Recharts/victory-vendor have circular
        // ESM imports, so Rollup can place a `const` wrapper BEFORE the value
        // it wraps is initialized → TDZ crash in production.
        // Using `var` (hoisted) eliminates the TDZ entirely.
        generatedCode: { constBindings: false },
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("react/") ||
            id.includes("react-dom/") ||
            id.includes("react-router-dom/")
          ) {
            return "vendor";
          }


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
  optimizeDeps: {
    // @material/web has no package root entry — only subpath exports (e.g. chips/chip-set.js)
    include: [
      '@lit/react',
      '@material/web/chips/chip-set.js',
      '@material/web/chips/filter-chip.js',
      '@material/web/textfield/outlined-text-field.js',
      '@material/web/button/filled-button.js',
      '@material/web/button/outlined-button.js',
      '@material/web/button/text-button.js',
      '@material/web/iconbutton/icon-button.js',
      '@material/web/divider/divider.js',
    ],
  },
  plugins: [react(), cfAsyncPlugin(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

/**
 * Injects data-cfasync="false" into every <script> and <link rel="modulepreload">
 * tag in the built HTML.  This tells Cloudflare Rocket Loader to leave our ES
 * modules alone — Rocket Loader breaks the execution order of dynamic imports,
 * causing "Cannot access 'X' before initialization" errors at runtime.
 */
function cfAsyncPlugin(): Plugin {
  return {
    name: "cloudflare-no-rocket-loader",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<script /g, '<script data-cfasync="false" ')
        .replace(/<link rel="modulepreload"/g, '<link data-cfasync="false" rel="modulepreload"');
    },
  };
}

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
