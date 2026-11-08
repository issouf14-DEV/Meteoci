/**
 * Couche d'accès à l'API OpenWeatherMap.
 * - réponses typées
 * - timeout via AbortController
 * - cache mémoire (5 min) + déduplication des requêtes en vol
 * - limitation de concurrence et espacement des requêtes (anti rate-limit)
 * - messages d'erreur en français
 */

const API_BASE = "https://api.openweathermap.org/data/2.5";
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_REQUESTS = 3;
const MIN_REQUEST_SPACING_MS = 120;
/** Écart toléré entre l'heure demandée et "maintenant" pour utiliser la météo actuelle. */
const CURRENT_TOLERANCE_MS = 90 * 60 * 1000;
/** Écart maximal entre l'heure demandée et l'entrée de prévision la plus proche. */
const FORECAST_TOLERANCE_MS = 3 * 60 * 60 * 1000;

export const API_KEY: string = (import.meta.env.VITE_OWM_API_KEY ?? "").trim();
export const hasApiKey = API_KEY.length > 0;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type LocationQuery = { q: string } | { id: number };

export interface OwmCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OwmMain {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
}

export interface OwmWind {
  speed: number;
  deg?: number;
  gust?: number;
}

export interface OwmCurrentResponse {
  id: number;
  name: string;
  dt: number;
  timezone: number;
  weather: OwmCondition[];
  main: OwmMain;
  wind?: OwmWind;
  sys?: { country?: string; sunrise?: number; sunset?: number };
}

export interface OwmForecastItem {
  dt: number;
  main: OwmMain;
  weather: OwmCondition[];
  wind?: OwmWind;
  pop?: number;
  dt_txt?: string;
}

export interface OwmForecastResponse {
  list: OwmForecastItem[];
  city: { id: number; name: string; country?: string; timezone?: number };
}

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
}

export interface FoundCity {
  id: number;
  name: string;
  country?: string;
}

export type WeatherErrorCode =
  | "NO_KEY"
  | "INVALID"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "SERVER"
  | "TIMEOUT"
  | "NETWORK"
  | "PAST_DATE"
  | "OUT_OF_RANGE"
  | "BAD_RESPONSE";

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
    case 401:
      return new WeatherError("UNAUTHORIZED", "Clé API invalide", status);
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

/* -------------------------------------------------------------------------- */
/*                       File d'attente / concurrence                         */
/* -------------------------------------------------------------------------- */

const queue: Array<() => void> = [];
let activeRequests = 0;
let lastRequestAt = 0;
let pumpTimer: ReturnType<typeof setTimeout> | null = null;

function pump(): void {
  if (pumpTimer !== null) return;
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || queue.length === 0) return;

  const wait = lastRequestAt + MIN_REQUEST_SPACING_MS - Date.now();
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
          pump();
        });
    });
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
  return "id" in query ? { id: String(query.id) } : { q: query.q };
}

function cacheKey(endpoint: string, query: LocationQuery): string {
  return `${endpoint}?${new URLSearchParams(queryParams(query)).toString()}`;
}

export function clearWeatherCache(): void {
  cache.clear();
}

/* -------------------------------------------------------------------------- */
/*                                  Requêtes                                  */
/* -------------------------------------------------------------------------- */

async function fetchJson<T>(url: string): Promise<T> {
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

  if (!response.ok) throw errorFromStatus(response.status);

  try {
    return (await response.json()) as T;
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

function request<T>(endpoint: "weather" | "forecast", query: LocationQuery, signal?: AbortSignal): Promise<T> {
  if (!hasApiKey) {
    return Promise.reject(new WeatherError("NO_KEY", "Clé API manquante"));
  }

  const key = cacheKey(endpoint, query);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data as T);
  }

  let pending = inFlight.get(key) as Promise<T> | undefined;
  if (!pending) {
    const params = new URLSearchParams({
      ...queryParams(query),
      units: "metric",
      lang: "fr",
      appid: API_KEY,
    });
    const url = `${API_BASE}/${endpoint}?${params.toString()}`;

    pending = schedule(() => fetchJson<T>(url))
      .then((data) => {
        cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
        return data;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  return withSignal(pending, signal);
}

function assertCurrent(data: OwmCurrentResponse): OwmCurrentResponse {
  if (!data?.main || !Array.isArray(data.weather) || data.weather.length === 0) {
    throw new WeatherError("BAD_RESPONSE", "Données météo incomplètes.");
  }
  return data;
}

export async function getCurrentWeather(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<OwmCurrentResponse> {
  return assertCurrent(await request<OwmCurrentResponse>("weather", query, signal));
}

export async function getForecast(
  query: LocationQuery,
  signal?: AbortSignal,
): Promise<OwmForecastResponse> {
  const data = await request<OwmForecastResponse>("forecast", query, signal);
  if (!data || !Array.isArray(data.list)) {
    throw new WeatherError("BAD_RESPONSE", "Prévisions indisponibles.");
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/*                               Normalisation                                */
/* -------------------------------------------------------------------------- */

const msToKmh = (speed: number | undefined) =>
  typeof speed === "number" && Number.isFinite(speed) ? Math.round(speed * 3.6) : null;

function snapshotFrom(
  item: { dt: number; main: OwmMain; weather: OwmCondition[]; wind?: OwmWind; pop?: number },
  isForecast: boolean,
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
  };
}

/**
 * Météo pour une date cible : actuelle si `target` est nul ou proche de
 * maintenant, sinon l'entrée de prévision (pas de 3 h, 5 jours) la plus proche.
 */
export async function getWeatherAt(
  query: LocationQuery,
  target: Date | null,
  signal?: AbortSignal,
): Promise<WeatherSnapshot> {
  const now = Date.now();
  const targetMs = target?.getTime() ?? now;

  if (Math.abs(targetMs - now) <= CURRENT_TOLERANCE_MS) {
    return snapshotFrom(await getCurrentWeather(query, signal), false);
  }

  if (targetMs < now) {
    throw new WeatherError(
      "PAST_DATE",
      "Les données passées ne sont pas disponibles. Choisissez une date à venir.",
    );
  }

  const forecast = await getForecast(query, signal);
  let closest: OwmForecastItem | null = null;
  let minDiff = Number.POSITIVE_INFINITY;
  for (const item of forecast.list) {
    const diff = Math.abs(item.dt * 1000 - targetMs);
    if (diff < minDiff && item.main && item.weather?.length) {
      minDiff = diff;
      closest = item;
    }
  }

  if (!closest || minDiff > FORECAST_TOLERANCE_MS) {
    throw new WeatherError("OUT_OF_RANGE", "Prévisions disponibles sur 5 jours maximum.");
  }
  return snapshotFrom(closest, true);
}

/**
 * Recherche une ville : d'abord en Côte d'Ivoire, puis partout dans le monde.
 */
export async function lookupCity(name: string, signal?: AbortSignal): Promise<FoundCity> {
  let data: OwmCurrentResponse;
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

  return { id: data.id, name: data.name || name, country: data.sys?.country };
}
