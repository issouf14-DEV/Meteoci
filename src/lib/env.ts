import { z } from "@/lib/zod";

/**
 * Adresse du proxy météo (Vercel Function `api/weather.ts`).
 *
 * Aucune clé API n'est lue côté client : la clé OpenWeatherMap reste sur le
 * serveur. `VITE_WEATHER_API_BASE` permet de viser un proxy hébergé ailleurs
 * (build GitHub Pages -> https://meteoci.vercel.app/api/weather).
 */
export const DEFAULT_WEATHER_API_BASE = "/api/weather";

/** Chemin relatif à l'origine : "/..." (pas "//", qui désignerait un autre hôte). */
const RELATIVE_PATH_PATTERN = /^\/(?!\/)[A-Za-z0-9._~\-/]*$/;
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isAllowedBase(value: string): boolean {
  if (RELATIVE_PATH_PATTERN.test(value)) return true;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const secure =
    url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  return secure && !url.username && !url.password && !url.search && !url.hash;
}

export const weatherApiBaseSchema = z
  .string()
  .check(
    z.trim(),
    z.refine(isAllowedBase, "VITE_WEATHER_API_BASE : URL https ou chemin relatif attendu"),
  );

/** Valide l'adresse configurée ; revient à la valeur par défaut si absente ou invalide. */
export function resolveWeatherApiBase(raw: unknown): string {
  if (raw === undefined || raw === "") return DEFAULT_WEATHER_API_BASE;
  const parsed = weatherApiBaseSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(parsed.error.issues[0]?.message ?? "VITE_WEATHER_API_BASE invalide");
    return DEFAULT_WEATHER_API_BASE;
  }
  return parsed.data.replace(/\/+$/, "") || DEFAULT_WEATHER_API_BASE;
}

export const WEATHER_API_BASE: string = resolveWeatherApiBase(
  import.meta.env.VITE_WEATHER_API_BASE,
);
