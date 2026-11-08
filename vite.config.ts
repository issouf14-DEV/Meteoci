import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Connect, defineConfig, loadEnv, type Plugin } from "vite";

import { handleWeatherRequest } from "./api/weather.ts";

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
  // Proxy météo : même origine sur Vercel, ou meteoci.vercel.app depuis GitHub Pages.
  "connect-src 'self' https://meteoci.vercel.app",
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

/**
 * Sert `/api/weather` en local (`vite` et `vite preview`) avec le même
 * gestionnaire que la Vercel Function. La clé est lue côté serveur dans
 * `.env.local` (`OWM_API_KEY`, sans préfixe VITE_ : jamais exposée au client).
 */
function weatherApiDev(): Plugin {
  let apiKey: string | undefined;

  const middleware: Connect.SimpleHandleFunction = async (req, res) => {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }
    if (!headers.has("x-forwarded-for") && req.socket.remoteAddress) {
      headers.set("x-forwarded-for", req.socket.remoteAddress);
    }

    // `originalUrl` : URL complète (connect retire le préfixe de montage de `url`).
    const path = req.originalUrl ?? req.url ?? "/";
    const request = new Request(new URL(path, "http://localhost"), {
      method: req.method ?? "GET",
      headers,
    });

    try {
      const response = await handleWeatherRequest(request, { apiKey });
      res.statusCode = response.status;
      response.headers.forEach((value, name) => {
        res.setHeader(name, value);
      });
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "UPSTREAM" }));
    }
  };

  return {
    name: "meteo-ci:weather-api-dev",
    configResolved(config) {
      if (config.command !== "serve") return;
      // Préfixe "" : lit aussi les variables non VITE_ (elles restent côté Node).
      apiKey = loadEnv(config.mode, config.envDir || process.cwd(), "").OWM_API_KEY;
    },
    configureServer(server) {
      server.middlewares.use("/api/weather", middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/weather", middleware);
    },
  };
}

export default defineConfig({
  // Chemins relatifs : fonctionne sur GitHub Pages (site de projet).
  base: "./",
  plugins: [react(), tailwindcss(), productionCsp(), weatherApiDev()],
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
