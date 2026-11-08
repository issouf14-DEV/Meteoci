/**
 * Couche d'accès aux données OpenWeatherMap, via le proxy serveur
 * `api/weather.ts` (la clé API n'est jamais présente côté client).
 * - réponses validées à l'exécution (schémas Zod)
 * - timeout via AbortController
 * - cache mémoire (5 min) + déduplication des requêtes en vol
 * - limitation de concurrence et espacement des requêtes (anti rate-limit),
 *   pause de la file après une réponse 429, puis une seule nouvelle tentative
 * - activité réseau observable (indicateur d'actualisation)
 * - messages d'erreur en français
 */

import { WEATHER_API_BASE } from "@/lib/env";
import {
  type OwmCondition,
  type OwmCurrentResponse,
  type OwmForecastItem,
  type OwmForecastResponse,
  type OwmMain,
  type OwmWind,
  owmCurrentResponseSchema,
  owmForecastResponseSchema,
} from "@/lib/schemas";
import { z } from "@/lib/zod";

export type { OwmCurrentResponse, OwmForecastItem, OwmForecastResponse };

/**
 * Schémas enrichis du décalage horaire (`timezone`, en secondes) : nécessaire
 * pour afficher l'heure locale des villes internationales.
 */
const currentSchema = z.extend(owmCurrentResponseSchema, { timezone: z.optional(z.number()) });
const forecastSchema = z.extend(owmForecastResponseSchema, {
  city: z.optional(z.object({ timezone: z.optional(z.number()) })),
});
type CurrentResponse = z.infer<typeof currentSchema>;
type ForecastResponse = z.infer<typeof forecastSchema>;

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_REQUESTS = 3;
const MIN_REQUEST_SPACING_MS = 120;
/** Pause de la file après un 429 (si l'API n'envoie pas d'en-tête Retry-After). */
const RATE_LIMIT_PAUSE_MS = 10_000;
const MAX_RATE_LIMIT_PAUSE_MS = 60_000;
/** Écart toléré entre l'heure demandée et "maintenant" pour utiliser la météo actuelle. */
export const CURRENT_TOLERANCE_MS = 90 * 60 * 1000;
/** Écart maximal entre l'heure demandée et l'entrée de prévision la plus proche. */
const FORECAST_TOLERANCE_MS = 3 * 60 * 60 * 1000;
/**
 * Horizon garanti des prévisions à partir de maintenant : 40 pas de 3 h dont
 * le premier tombe dans les 3 h, soit au moins 117 h (4 j 21 h).
 */
export const FORECAST_HORIZON_MS = 117 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type LocationQuery = { q: string } | { id: number } | { lat: number; lon: number };

export interface WeatherSnapshot {
  conditionId: number;
  main: string;
  description: string;
  icon: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  /** Vitesse du vent en km/h. */
  windKmh: number | null;
  /** Probabilité de précipitation (0-1), prévisions uniquement. */
  pop: number | null;
  /** Horodatage de la donnée (ms). */
  timestamp: number;
  isForecast: boolean;
  /** Heure à laquelle la donnée a été obtenue (ms). */
  fetchedAt: number;
  /** Décalage UTC du lieu en secondes (null si l'API ne l'a pas fourni). */
  utcOffsetSec: number | null;
}

export interface FoundCity {
  id: number;
  name: string;
  country?: string;
  /** Décalage UTC en secondes. */
  utcOffsetSec?: number;
}

export type WeatherErrorCode =
  | "NO_KEY"
  | "INVALID"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "SERVER"
  | "TIMEOUT"
  | "NETWORK"
  | "PAST_DATE"
  | "OUT_OF_RANGE"
  | "BAD_RESPONSE";

/** Erreurs passagères : une nouvelle tentative peut réussir. */
export const RETRYABLE_CODES: ReadonlySet<WeatherErrorCode> = new Set([
  "NETWORK",
  "TIMEOUT",
  "SERVER",
  "RATE_LIMIT",
  "BAD_RESPONSE",
]);

export class WeatherError extends Error {
  readonly code: WeatherErrorCode;
  readonly status?: number;

  constructor(code: WeatherErrorCode, message: string, status?: number) {
    super(message);
    this.name = "WeatherError";
    this.code = code;
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Erreurs                                   */
/* -------------------------------------------------------------------------- */

function errorFromStatus(status: number): WeatherError {
  switch (status) {
    case 400:
      return new WeatherError("INVALID", "Requête invalide.", status);
    case 403:
      return new WeatherError("FORBIDDEN", "Accès au service météo refusé.", status);
    case 404:
      return new WeatherError("NOT_FOUND", "Ville non trouvée", status);
    case 429:
      return new WeatherError("RATE_LIMIT", "Trop de requêtes, réessayez dans un instant", status);
    default:
      return status >= 500
        ? new WeatherError("SERVER", "Service météo momentanément indisponible", status)
        : new WeatherError("BAD_RESPONSE", `Erreur inattendue (${status})`, status);
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function toUserMessage(error: unknown): string {
  if (error instanceof WeatherError) return error.message;
  return "Une erreur inattendue est survenue.";
}

function abortError(): DOMException {
  return new DOMException("Requête annulée", "AbortError");
}

const noKeyError = () =>
  new WeatherError("NO_KEY", "Service météo indisponible (serveur non configuré).", 503);

/* -------------------------------------------------------------------------- */
/*                     Disponibilité du service (proxy)                       */
/* -------------------------------------------------------------------------- */

/**
 * Passe à `false` dès que le proxy signale l'absence de clé côté serveur
 * (503 `{ error: "NO_KEY" }`) : les requêtes suivantes sont alors évitées.
 */
let serviceAvailable = true;
const serviceListeners = new Set<() => void>();

export const isWeatherServiceAvailable = (): boolean => serviceAvailable;

export function subscribeWeatherService(listener: () => void): () => void {
  serviceListeners.add(listener);
  return () => {
    serviceListeners.delete(listener);
  };
}

function markServiceUnavailable(): void {
  if (!serviceAvailable) return;
  serviceAvailable = false;
  for (const listener of serviceListeners) listener();
}

/* -------------------------------------------------------------------------- */
/*                       File d'attente / concurrence                         */
/* -------------------------------------------------------------------------- */

const queue: Array<() => void> = [];
let activeRequests = 0;
let lastRequestAt = 0;
/** Horodatage jusqu'auquel la file reste en pause après un 429. */
let pausedUntil = 0;
let pumpTimer: ReturnType<typeof setTimeout> | null = null;

/* Activité réseau observable (requêtes en cours + en attente). */
const activityListeners = new Set<() => void>();
let activityCount = 0;

function notifyActivity(): void {
  const next = activeRequests + queue.length;
  if (next === activityCount) return;
  activityCount = next;
  for (const listener of activityListeners) listener();
}

export function subscribeWeatherActivity(listener: () => void): () => void {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
}

/** Nombre de requêtes météo en cours ou en attente. */
export const getWeatherActivity = (): number => activityCount;

/** Temps restant (ms) avant la fin de la pause imposée par un 429 (0 si aucune). */
export const rateLimitRemainingMs = (): number => Math.max(0, pausedUntil - Date.now());

function pauseQueue(retryAfterHeader: string | null): void {
  const seconds = Number(retryAfterHeader);
  const pause =
    Number.isFinite(seconds) && seconds > 0
      ? Math.min(seconds * 1000, MAX_RATE_LIMIT_PAUSE_MS)
      : RATE_LIMIT_PAUSE_MS;
  pausedUntil = Math.max(pausedUntil, Date.now() + pause);
}

function pump(): void {
  if (pumpTimer !== null) return;
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || queue.length === 0) return;

  const wait = Math.max(lastRequestAt + MIN_REQUEST_SPACING_MS, pausedUntil) - Date.now();
  if (wait > 0) {
    pumpTimer = setTimeout(() => {
      pumpTimer = null;
      pump();
    }, wait);
    return;
  }

  const next = queue.shift();
  next?.();
  pump();
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
      activeRequests += 1;
      lastRequestAt = Date.now();
      task()
        .then(resolve, reject)
        .finally(() => {
          activeRequests -= 1;
          notifyActivity();
          pump();
        });
    });
    notifyActivity();
    pump();
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Cache                                    */
/* -------------------------------------------------------------------------- */

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

function queryParams(query: LocationQuery): Record<string, string> {
  if ("id" in query) return { id: String(query.id) };
  if ("lat" in query) return { lat: String(query.lat), lon: String(query.lon) };
  return { q: query.q };
}

/** Clé stable d'un lieu (pour les dépendances d'effets). */
export function locationKey(query: LocationQuery): string {
  return new URLSearchParams(queryParams(query)).toString();
}

function cacheKey(endpoint: string, query: LocationQuery): string {
  return `${endpoint}?${locationKey(query)}`;
}

/**
 * Marque toutes les réponses en cache comme périmées : la prochaine lecture
 * relance une requête. Les entrées ne sont pas supprimées.
 */
export function invalidateWeatherCache(): void {
  for (const entry of cache.values()) entry.expiresAt = 0;
}

/* -------------------------------------------------------------------------- */
/*                                  Requêtes                                  */
/* -------------------------------------------------------------------------- */

const proxyErrorSchema = z.object({ error: z.string() });

/** Code d'erreur `{ error }` renvoyé par le proxy (null si absent ou illisible). */
async function proxyErrorCode(response: Response): Promise<string | null> {
  try {
    const parsed = proxyErrorSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.error : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
  } catch {
    if (controller.signal.aborted) {
      throw new WeatherError("TIMEOUT", "Le service météo met trop de temps à répondre.");
    }
    throw new WeatherError("NETWORK", "Connexion impossible. Vérifiez votre réseau.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) pauseQueue(response.headers.get("Retry-After"));
    if (response.status === 503 && (await proxyErrorCode(response)) === "NO_KEY") {
      markServiceUnavailable();
      throw noKeyError();
    }
    throw errorFromStatus(response.status);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new WeatherError("BAD_RESPONSE", "Réponse invalide du service météo.");
  }
}

/** Rejette la promesse dès que le signal de l'appelant est annulé. */
function withSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/** Valide une réponse brute ; lève une erreur typée si elle ne respecte pas le schéma. */
function parseResponse<S extends z.ZodMiniType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new WeatherError("BAD_RESPONSE", "Réponse météo invalide");
  }
  return result.data;
}

function request<S extends z.ZodMiniType>(
  endpoint: "weather" | "forecast",
  query: LocationQuery,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  if (!serviceAvailable) return Promise.reject(noKeyError());

  const key = cacheKey(endpoint, query);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data as z.infer<S>);
  }

  let pending = inFlight.get(key) as Promise<z.infer<S>> | undefined;
  if (!pending) {
    // Le proxy impose lui-même units=metric et lang=fr.
    const params = new URLSearchParams({ endpoint, ...queryParams(query) });
    const url = `${WEATHER_API_BASE}?${params.toString()}`;

    const run = () => schedule(() => fetchJson(url));
    pending = run()
      // Après un 429, la file est en pause : une seule nouvelle tentative, différée d'autant.
      .catch((error: unknown) => {
        if (error instanceof WeatherError && error.code === "RATE_LIMIT") return run();
        throw error;
      })
      .then((raw) => {
        const data = parseResponse(schema, raw);
        cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
        return data;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  return withSignal(pending, signal);
}

export function getCurrentWeather(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<CurrentResponse> {
  return request("weather", query, currentSchema, signal);
}

export function getForecast(query: LocationQuery, signal?: AbortSignal): Promise<ForecastResponse> {
  return request("forecast", query, forecastSchema, signal);
}

/* -------------------------------------------------------------------------- */
/*                               Normalisation                                */
/* -------------------------------------------------------------------------- */

const msToKmh = (speed: number | undefined) =>
  typeof speed === "number" && Number.isFinite(speed) ? Math.round(speed * 3.6) : null;

function snapshotFrom(
  item: {
    dt: number;
    main: OwmMain;
    weather: OwmCondition[];
    wind?: OwmWind | undefined;
    pop?: number | undefined;
  },
  isForecast: boolean,
  utcOffsetSec: number | undefined,
): WeatherSnapshot {
  const condition = item.weather[0];
  return {
    conditionId: condition.id,
    main: condition.main,
    description: condition.description,
    icon: condition.icon,
    temp: item.main.temp,
    feelsLike: item.main.feels_like,
    tempMin: item.main.temp_min,
    tempMax: item.main.temp_max,
    humidity: item.main.humidity,
    windKmh: msToKmh(item.wind?.speed),
    pop: typeof item.pop === "number" ? item.pop : null,
    timestamp: item.dt * 1000,
    isForecast,
    fetchedAt: Date.now(),
    utcOffsetSec: typeof utcOffsetSec === "number" ? utcOffsetSec : null,
  };
}

/**
 * Météo pour une date cible (ms) : actuelle si `targetMs` est nul ou proche de
 * maintenant, sinon l'entrée de prévision (pas de 3 h, 5 jours) la plus proche.
 */
export async function getWeatherAt(
  query: LocationQuery,
  targetMs: number | null,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const now = Date.now();
  const target = targetMs ?? now;

  if (Math.abs(target - now) <= CURRENT_TOLERANCE_MS) {
    const current = await getCurrentWeather(query, signal);
    return snapshotFrom(current, false, current.timezone);
  }

  if (target < now) {
    throw new WeatherError(
      "PAST_DATE",
      "Les données passées ne sont pas disponibles. Choisissez une date à venir.",
    );
  }

  const forecast = await getForecast(query, signal);
  let closest: OwmForecastItem | null = null;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const item of forecast.list) {
    const diff = Math.abs(item.dt * 1000 - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }

  if (!closest || minDiff > FORECAST_TOLERANCE_MS) {
    throw new WeatherError("OUT_OF_RANGE", "Prévisions disponibles sur 5 jours maximum.");
  }
  return snapshotFrom(closest, true, forecast.city?.timezone);
}

/**
 * Recherche une ville : d'abord en Côte d'Ivoire, puis partout dans le monde.
 */
export async function lookupCity(name: string, signal?: AbortSignal): Promise<FoundCity> {
  let data: CurrentResponse;
  try {
    data = await getCurrentWeather({ q: `${name},CI` }, signal);
  } catch (error) {
    if (!(error instanceof WeatherError) || error.code !== "NOT_FOUND") throw error;
    data = await getCurrentWeather({ q: name }, signal);
  }

  // Pré-remplit le cache pour la requête par identifiant utilisée par la carte.
  cache.set(cacheKey("weather", { id: data.id }), {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return {
    id: data.id,
    name: data.name || name,
    country: data.sys?.country,
    utcOffsetSec: data.timezone,
  };
}
