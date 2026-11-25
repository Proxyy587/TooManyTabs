import { defineConfig } from "vitest/config"
import path from "path"

// Separate from vite.config.ts so tests never run the dist/ manifest patcher.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
})
