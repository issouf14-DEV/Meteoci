/**
 * Vercel Function : proxy vers l'API OpenWeatherMap (2.5).
 *
 * La clé OpenWeatherMap reste côté serveur (variable d'environnement
 * `OWM_API_KEY`, jamais préfixée par VITE_) : elle n'est jamais envoyée au
 * navigateur.
 *
 * - liste blanche stricte des paramètres : `endpoint` (weather | forecast) et
 *   un seul lieu (`lat` + `lon`, `id` ou `q`) ; tout autre paramètre est refusé ;
 * - `units=metric` et `lang=fr` imposés ;
 * - timeout de la requête amont ;
 * - erreurs amont converties en JSON `{ error }` sans divulguer la clé ni l'URL ;
 * - réponses réussies mises en cache par le CDN de Vercel (s-maxage) ;
 * - CORS limité aux origines du site ;
 * - limitation de débit par IP en mémoire (best effort : par instance).
 *
 * Module autonome (aucune dépendance) : il est aussi utilisé par le serveur de
 * développement Vite (voir vite.config.ts).
 */

const UPSTREAM_BASE = "https://api.openweathermap.org/data/2.5";
const UPSTREAM_TIMEOUT_MS = 8_000;
/** Taille maximale acceptée pour une réponse amont (une prévision fait ~20 ko). */
const MAX_UPSTREAM_BYTES = 1_000_000;

const SUCCESS_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const RATE_LIMIT_MAX_TRACKED_IPS = 5_000;

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://issouf14-dev.github.io",
  "https://meteoci.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
]);
/** Déploiements de prévisualisation Vercel du projet. */
const PREVIEW_ORIGIN_PATTERN =
  /^https:\/\/meteoci-[a-z0-9-]{1,63}-fofanaissouf179-7845s-projects\.vercel\.app$/;

const ENDPOINTS: ReadonlySet<string> = new Set(["weather", "forecast"]);

/* Même règle que la recherche de l'application (src/lib/schemas.ts). */
const CITY_NAME_MIN_LENGTH = 2;
const CITY_NAME_MAX_LENGTH = 60;
const CITY_NAME_PATTERN = /^[\p{L}\p{M}](?:[\p{L}\p{M}\s'’-]*[\p{L}\p{M}])?$/u;
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;

const COORDINATE_PATTERN = /^-?\d{1,3}(?:\.\d{1,10})?$/;
const CITY_ID_PATTERN = /^[1-9]\d{0,9}$/;
const API_KEY_PATTERN = /^[a-f0-9]{32}$/i;

export type ProxyErrorCode =
  | "INVALID"
  | "FORBIDDEN_ORIGIN"
  | "METHOD_NOT_ALLOWED"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "NO_KEY"
  | "UPSTREAM"
  | "TIMEOUT";

export interface WeatherProxyOptions {
  /** Clé OpenWeatherMap (lue côté serveur uniquement). */
  apiKey: string | undefined;
  /** Implémentation de fetch (injectable pour les tests). */
  fetch?: typeof fetch;
  /** Horloge (injectable pour les tests). */
  now?: () => number;
}

/* -------------------------------------------------------------------------- */
/*                                    CORS                                    */
/* -------------------------------------------------------------------------- */

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN_PATTERN.test(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Accept",
    "Access-Control-Max-Age": "86400",
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Réponses                                  */
/* -------------------------------------------------------------------------- */

function baseHeaders(origin: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    // La réponse dépend de l'origine (en-tête CORS) : clé de cache distincte.
    Vary: "Origin",
    ...corsHeaders(origin),
  };
}

function errorResponse(
  status: number,
  error: ProxyErrorCode,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...baseHeaders(origin), "Cache-Control": "no-store", ...extraHeaders },
  });
}

/* -------------------------------------------------------------------------- */
/*                         Limitation de débit (IP)                           */
/* -------------------------------------------------------------------------- */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Compteurs par IP, en mémoire : propres à chaque instance de la fonction et
 * perdus à son recyclage. C'est une protection « best effort », pas une
 * garantie (le cache CDN absorbe l'essentiel des requêtes répétées).
 */
const rateLimits = new Map<string, RateLimitEntry>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Renvoie le nombre de secondes à attendre si la limite est atteinte, sinon 0. */
function rateLimitRetryAfter(ip: string, now: number): number {
  if (rateLimits.size > RATE_LIMIT_MAX_TRACKED_IPS) {
    for (const [key, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(key);
    }
    // Encore trop d'entrées actives : on repart de zéro plutôt que de saturer la mémoire.
    if (rateLimits.size > RATE_LIMIT_MAX_TRACKED_IPS) rateLimits.clear();
  }

  const entry = rateLimits.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return 0;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  }
  return 0;
}

/** Réinitialise les compteurs de débit (tests). */
export function resetRateLimits(): void {
  rateLimits.clear();
}

/* -------------------------------------------------------------------------- */
/*                         Validation des paramètres                          */
/* -------------------------------------------------------------------------- */

type Location = { lat: string; lon: string } | { id: string } | { q: string };

interface ValidQuery {
  endpoint: "weather" | "forecast";
  location: Location;
}

function parseCoordinate(raw: string, limit: number): string | null {
  if (!COORDINATE_PATTERN.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return String(value);
}

function parseCityQuery(raw: string): string | null {
  const parts = raw.split(",");
  if (parts.length > 2) return null;

  const name = parts[0].normalize("NFC").trim().replace(/\s+/g, " ");
  if (
    name.length < CITY_NAME_MIN_LENGTH ||
    name.length > CITY_NAME_MAX_LENGTH ||
    !CITY_NAME_PATTERN.test(name)
  ) {
    return null;
  }

  if (parts.length === 1) return name;
  const country = parts[1].trim();
  if (!COUNTRY_CODE_PATTERN.test(country)) return null;
  return `${name},${country.toUpperCase()}`;
}

const ALLOWED_PARAMS: ReadonlySet<string> = new Set(["endpoint", "lat", "lon", "id", "q"]);

/** Valide la requête ; renvoie null si un paramètre est absent, inconnu, répété ou invalide. */
export function parseWeatherQuery(params: URLSearchParams): ValidQuery | null {
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key) || seen.has(key)) return null;
    seen.add(key);
  }

  const endpoint = params.get("endpoint");
  if (endpoint === null || !ENDPOINTS.has(endpoint)) return null;

  const lat = params.get("lat");
  const lon = params.get("lon");
  const id = params.get("id");
  const q = params.get("q");

  const kinds = [lat !== null || lon !== null, id !== null, q !== null].filter(Boolean).length;
  if (kinds !== 1) return null;

  let location: Location | null = null;
  if (lat !== null || lon !== null) {
    const latitude = lat === null ? null : parseCoordinate(lat, 90);
    const longitude = lon === null ? null : parseCoordinate(lon, 180);
    location = latitude !== null && longitude !== null ? { lat: latitude, lon: longitude } : null;
  } else if (id !== null) {
    location = CITY_ID_PATTERN.test(id) ? { id } : null;
  } else if (q !== null) {
    const city = parseCityQuery(q);
    location = city === null ? null : { q: city };
  }

  return location ? { endpoint: endpoint as ValidQuery["endpoint"], location } : null;
}

/* -------------------------------------------------------------------------- */
/*                                  Handler                                   */
/* -------------------------------------------------------------------------- */

function upstreamErrorResponse(upstream: Response, origin: string | null): Response {
  switch (upstream.status) {
    case 400:
      return errorResponse(400, "INVALID", origin);
    case 404:
      return errorResponse(404, "NOT_FOUND", origin);
    case 429: {
      const retryAfter = Number(upstream.headers.get("Retry-After"));
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60;
      return errorResponse(429, "RATE_LIMIT", origin, { "Retry-After": String(seconds) });
    }
    default:
      // 401 (clé refusée), 5xx... : détail consigné côté serveur uniquement.
      console.error(`[api/weather] réponse amont inattendue : ${upstream.status}`);
      return errorResponse(502, "UPSTREAM", origin);
  }
}

export async function handleWeatherRequest(
  request: Request,
  options: WeatherProxyOptions,
): Promise<Response> {
  const origin = request.headers.get("Origin");
  // Une origine étrangère est refusée d'emblée (sans en-tête CORS) : un autre
  // site ne peut pas consommer le quota de la clé depuis le navigateur.
  if (origin !== null && !isAllowedOrigin(origin)) {
    return errorResponse(403, "FORBIDDEN_ORIGIN", null);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(origin), Vary: "Origin", "Cache-Control": "no-store" },
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", origin, { Allow: "GET, HEAD, OPTIONS" });
  }

  const now = options.now?.() ?? Date.now();
  const retryAfter = rateLimitRetryAfter(clientIp(request), now);
  if (retryAfter > 0) {
    return errorResponse(429, "RATE_LIMIT", origin, { "Retry-After": String(retryAfter) });
  }

  const query = parseWeatherQuery(new URL(request.url).searchParams);
  if (!query) return errorResponse(400, "INVALID", origin);

  const apiKey = options.apiKey?.trim() ?? "";
  if (!API_KEY_PATTERN.test(apiKey)) return errorResponse(503, "NO_KEY", origin);

  const upstreamParams = new URLSearchParams({
    ...query.location,
    units: "metric",
    lang: "fr",
    appid: apiKey,
  });
  const fetchImpl = options.fetch ?? fetch;

  let upstream: Response;
  try {
    upstream = await fetchImpl(`${UPSTREAM_BASE}/${query.endpoint}?${upstreamParams.toString()}`, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return errorResponse(504, "TIMEOUT", origin);
    }
    console.error("[api/weather] service amont injoignable");
    return errorResponse(502, "UPSTREAM", origin);
  }

  if (!upstream.ok) return upstreamErrorResponse(upstream, origin);

  let body: string;
  try {
    const text = await upstream.text();
    if (text.length > MAX_UPSTREAM_BYTES) throw new Error("too large");
    // Ré-sérialisation : garantit un JSON valide (pas de contenu arbitraire relayé).
    body = JSON.stringify(JSON.parse(text) as unknown);
  } catch {
    console.error("[api/weather] réponse amont illisible");
    return errorResponse(502, "UPSTREAM", origin);
  }

  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: { ...baseHeaders(origin), "Cache-Control": SUCCESS_CACHE_CONTROL },
  });
}

/** Point d'entrée Vercel (gestionnaire Web standard `fetch`). */
export default {
  fetch(request: Request): Promise<Response> {
    return handleWeatherRequest(request, { apiKey: process.env.OWM_API_KEY });
  },
};
