import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";

/** Inject .env into dist/manifest.json + dist/background.js (extensions can't read process.env). */
function injectExtensionEnv(mode: string): Plugin {
  return {
    name: "inject-extension-env",
    closeBundle() {
      const env = loadEnv(mode, process.cwd(), "");
      const clientId = (env.GOOGLE_CLIENT_ID || "").trim();
      const apiBase = (env.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

      if (!clientId || !clientId.includes(".apps.googleusercontent.com")) {
        throw new Error(
          "[build] GOOGLE_CLIENT_ID missing/invalid in .env — " +
            "set it to your Chrome Extension OAuth client ID"
        );
      }

      const manifestPath = path.resolve(__dirname, "dist/manifest.json");
      const backgroundPath = path.resolve(__dirname, "dist/background.js");

      if (!fs.existsSync(manifestPath)) {
        throw new Error("[build] dist/manifest.json not found");
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        oauth2?: { client_id?: string };
      };
      if (!manifest.oauth2) manifest.oauth2 = {};
      manifest.oauth2.client_id = clientId;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

      if (fs.existsSync(backgroundPath)) {
        let bg = fs.readFileSync(backgroundPath, "utf8");
        bg = bg.replace(
          /const API_BASE_URL = ["'][^"']*["']/,
          `const API_BASE_URL = ${JSON.stringify(apiBase)}`
        );
        fs.writeFileSync(backgroundPath, bg);
      }

      console.log(`[build] oauth2.client_id ← ${clientId}`);
      console.log(`[build] API_BASE_URL     ← ${apiBase}`);
      console.log(
        `[build] Extension ID must be: najlilhbfkkocnnhfaofffpfehcipahe (manifest key)`
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), tailwindcss(), injectExtensionEnv(mode)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "index.html"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  publicDir: "public",
}));
