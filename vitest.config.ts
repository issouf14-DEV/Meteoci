import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Configuration Vitest, indépendante de vite.config.ts (plugins de build, CSP) :
 * seul l'alias `@` est repris.
 *
 * Fuseau du navigateur volontairement éloigné de celui des villes (UTC-5/-4,
 * avec heure d'été) : toute lecture accidentelle de l'heure locale de la machine
 * au lieu de l'heure de la ville fait échouer les tests, quel que soit le
 * fuseau du poste ou de la CI. Défini ici pour être hérité par les workers.
 */
process.env.TZ = "America/New_York";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    env: { TZ: "America/New_York" },
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/vite-env.d.ts"],
      reporter: ["text", "html"],
    },
  },
});
