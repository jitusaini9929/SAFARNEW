import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    include: ["client/**/__tests__/**/*.test.ts"],
    environment: "node",
    testTimeout: 10000,
  },
});
