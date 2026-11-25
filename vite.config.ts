import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import tailwindcss from "@tailwindcss/vite";

const EXTENSION_ID = "najlilhbfkkocnnhfaofffpfehcipahe";
const CLIENT_ID_SHAPE = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

type ExtensionEnv = {
  extensionClientId: string;
  webClientId: string;
  apiBase: string;
  legacyAlias: boolean;
};

function readExtensionEnv(mode: string): ExtensionEnv {
  const env = loadEnv(mode, process.cwd(), "");
  const explicit = (env.GOOGLE_EXTENSION_CLIENT_ID || "").trim();
  const legacy = (env.GOOGLE_CLIENT_ID || "").trim();
  return {
    extensionClientId: explicit || legacy,
    webClientId: (env.GOOGLE_WEB_CLIENT_ID || "").trim(),
    apiBase: (env.API_BASE_URL || "http://localhost:3000").trim().replace(/\/$/, ""),
    legacyAlias: !explicit && Boolean(legacy),
  };
}

/** Never log a full client ID: they are public, but logs get pasted around. */
function mask(id: string): string {
  return id ? `${id.slice(0, 4)}…${id.slice(-31)} (${id.length} chars)` : "(not set)";
}

function assertShape(name: string, id: string) {
  if (id && !CLIENT_ID_SHAPE.test(id)) {
    throw new Error(`[build] ${name} doesn't look like a Google OAuth client ID (…apps.googleusercontent.com).`);
  }
}

/**
 * Extensions can't read .env at runtime, so after Vite writes dist/ we patch:
 *  - manifest.json  oauth2.client_id   ← Chrome Extension client (getAuthToken)
 *  - manifest.json  host_permissions   ← API_BASE_URL origin
 *  - background.js  API_BASE_URL
 * The Web client ID (launchWebAuthFlow) is compiled into the page via `define`.
 * Secrets are never read into the bundle; a final scan fails the build if one leaks.
 */
function injectExtensionEnv(mode: string): Plugin {
  return {
    name: "inject-extension-env",
    closeBundle() {
      const cfg = readExtensionEnv(mode);
      assertShape("GOOGLE_EXTENSION_CLIENT_ID", cfg.extensionClientId);
      assertShape("GOOGLE_WEB_CLIENT_ID", cfg.webClientId);

      let apiOrigin: string;
      try {
        apiOrigin = new URL(cfg.apiBase).origin;
      } catch {
        throw new Error("[build] API_BASE_URL is not a valid URL");
      }

      const dist = path.resolve(__dirname, "dist");
      const manifestPath = path.join(dist, "manifest.json");
      const backgroundPath = path.join(dist, "background.js");
      if (!fs.existsSync(manifestPath)) throw new Error("[build] dist/manifest.json not found");

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        oauth2?: { client_id?: string; scopes?: string[] };
        host_permissions?: string[];
      };
      if (cfg.extensionClientId) {
        manifest.oauth2 = { ...(manifest.oauth2 || {}), client_id: cfg.extensionClientId };
      } else {
        delete manifest.oauth2;
      }
      manifest.host_permissions = [`${apiOrigin}/*`];
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

      if (fs.existsSync(backgroundPath)) {
        const bg = fs
          .readFileSync(backgroundPath, "utf8")
          .replace(/const API_BASE_URL = ["'][^"']*["']/, `const API_BASE_URL = ${JSON.stringify(cfg.apiBase)}`);
        fs.writeFileSync(backgroundPath, bg);
      }

      scanForSecrets(mode, dist);

      console.log(`[build] extension client (getAuthToken)   ${mask(cfg.extensionClientId)}`);
      console.log(`[build] web client (launchWebAuthFlow)    ${mask(cfg.webClientId)}`);
      console.log(`[build] API_BASE_URL                      ${cfg.apiBase}`);
      console.log(`[build] extension ID (manifest key)       ${EXTENSION_ID}`);
      console.log(`[build] web-flow redirect URI             https://${EXTENSION_ID}.chromiumapp.org/`);
      if (cfg.legacyAlias) {
        console.warn("[build] note: using legacy GOOGLE_CLIENT_ID as the Chrome Extension client. Rename it to GOOGLE_EXTENSION_CLIENT_ID.");
      }
      if (!cfg.extensionClientId && !cfg.webClientId) {
        console.warn("[build] no Google client configured: this build is guest-only (sign-in disabled).");
      } else if (!cfg.webClientId) {
        console.warn("[build] GOOGLE_WEB_CLIENT_ID not set: sign-in works only in Google Chrome (not Brave/Arc/Edge). See AUTH.md.");
      }
    },
  };
}

/** Fail the build if any server-side secret value ended up in dist/. */
function scanForSecrets(mode: string, dist: string) {
  const env = loadEnv(mode, process.cwd(), "");
  const serverEnvPath = path.resolve(__dirname, "server/.env");
  const serverEnv = fs.existsSync(serverEnvPath)
    ? Object.fromEntries(
        fs
          .readFileSync(serverEnvPath, "utf8")
          .split("\n")
          .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
          .filter((m): m is RegExpMatchArray => Boolean(m))
          .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")])
      )
    : {};
  const secretKeys = ["GOOGLE_CLIENT_SECRET", "GOOGLE_WEB_CLIENT_SECRET", "JWT_SECRET", "DATABASE_URL", "BETTER_AUTH_SECRET"];
  const secrets = secretKeys
    .flatMap((k) => [env[k], serverEnv[k]])
    .filter((v): v is string => typeof v === "string" && v.length >= 8);
  if (!secrets.length) return;
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]
    );
  for (const file of walk(dist)) {
    if (!/\.(js|json|html|css|map|txt)$/.test(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (secrets.some((s) => text.includes(s))) {
      throw new Error(`[build] a server secret was found in ${path.relative(__dirname, file)}. Refusing to ship it.`);
    }
  }
}

export default defineConfig(({ mode }) => {
  const cfg = readExtensionEnv(mode);
  return {
    base: "./",
    plugins: [react(), tailwindcss(), injectExtensionEnv(mode)],
    define: {
      __GOOGLE_WEB_CLIENT_ID__: JSON.stringify(cfg.webClientId),
    },
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
  };
});
