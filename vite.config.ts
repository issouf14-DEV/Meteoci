import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Content-Security-Policy injectée uniquement dans le build de production.
 * Le serveur de dev de Vite injecte des scripts inline (HMR), incompatibles
 * avec `script-src 'self'`.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://openweathermap.org",
  "connect-src https://api.openweathermap.org",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function productionCsp(): Plugin {
  return {
    name: "meteo-ci:csp",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: () => [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
          injectTo: "head-prepend",
        },
      ],
    },
  };
}

export default defineConfig({
  // Chemins relatifs : fonctionne sur GitHub Pages (site de projet).
  base: "./",
  plugins: [react(), tailwindcss(), productionCsp()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
  },
});
