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
  "default-src 'none'",
  "script-src 'self'",
  // 'unsafe-inline' requis par sonner (styles injectés à l'exécution).
  "style-src 'self' 'unsafe-inline'",
  // Polices auto-hébergées (@fontsource-variable).
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src https://api.openweathermap.org",
  "media-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "upgrade-insecure-requests",
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
    rolldownOptions: {
      output: {
        // React / React DOM dans un chunk séparé : il change rarement et reste
        // en cache navigateur d'un déploiement à l'autre.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
