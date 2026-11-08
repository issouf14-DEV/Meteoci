import { useCallback, useEffect, useRef, useState } from "react";

import {
  getWeatherAt,
  hasApiKey,
  isAbortError,
  type LocationQuery,
  toUserMessage,
  WeatherError,
  type WeatherErrorCode,
  type WeatherSnapshot,
} from "@/lib/weather";

export type WeatherState =
  | { status: "loading"; data: WeatherSnapshot | null; error: null; code: null }
  | { status: "success"; data: WeatherSnapshot; error: null; code: null }
  | { status: "error"; data: null; error: string; code: WeatherErrorCode | null };

const queryKeyOf = (query: LocationQuery) => ("id" in query ? `id:${query.id}` : `q:${query.q}`);

/**
 * Charge la météo d'un lieu pour une date cible (null = maintenant).
 * Les données précédentes restent affichées pendant un rafraîchissement.
 */
export function useWeather(query: LocationQuery, target: Date | null, refreshKey: number) {
  const [state, setState] = useState<WeatherState>(() =>
    hasApiKey
      ? { status: "loading", data: null, error: null, code: null }
      : { status: "error", data: null, error: "Clé API manquante", code: "NO_KEY" },
  );
  const [attempt, setAttempt] = useState(0);

  const queryRef = useRef(query);
  queryRef.current = query;
  const queryKey = queryKeyOf(query);
  const targetMs = target?.getTime() ?? null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `queryKey` (clé stable de `queryRef.current`), `refreshKey` et `attempt` sont des déclencheurs volontaires de rechargement.
  useEffect(() => {
    if (!hasApiKey) return;

    const controller = new AbortController();
    setState((prev) => ({
      status: "loading",
      data: prev.status === "error" ? null : prev.data,
      error: null,
      code: null,
    }));

    getWeatherAt(queryRef.current, targetMs === null ? null : new Date(targetMs), controller.signal)
      .then((data) => setState({ status: "success", data, error: null, code: null }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setState({
          status: "error",
          data: null,
          error: toUserMessage(error),
          code: error instanceof WeatherError ? error.code : null,
        });
      });

    return () => controller.abort();
  }, [queryKey, targetMs, refreshKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
