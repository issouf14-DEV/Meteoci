import { useCallback, useEffect, useRef, useState } from "react";

import {
  getWeatherAt,
  hasApiKey,
  isAbortError,
  type LocationQuery,
  locationKey,
  toUserMessage,
  WeatherError,
  type WeatherErrorCode,
  type WeatherSnapshot,
} from "@/lib/weather";

export interface WeatherState {
  status: "loading" | "success" | "error";
  /**
   * Dernière donnée valide. En cas d'échec d'un rafraîchissement, elle reste
   * disponible (affichée comme « données de HH:MM ») au lieu d'être effacée.
   */
  data: WeatherSnapshot | null;
  error: string | null;
  code: WeatherErrorCode | null;
}

interface InternalState extends WeatherState {
  /** Requête (lieu + date cible) à laquelle correspond `data`. */
  dataKey: string | null;
}

const INITIAL: InternalState = hasApiKey
  ? { status: "loading", data: null, error: null, code: null, dataKey: null }
  : { status: "error", data: null, error: "Clé API manquante", code: "NO_KEY", dataKey: null };

/**
 * Charge la météo d'un lieu pour une date cible (ms, null = maintenant).
 * - les données précédentes restent affichées pendant un rafraîchissement ;
 * - si un rafraîchissement échoue, la dernière donnée valide du même lieu et
 *   de la même date est conservée (statut "error" + `data` non nul) ;
 * - `enabled = false` suspend les requêtes (carte masquée) sans perdre l'état.
 */
export function useWeather(
  query: LocationQuery,
  targetMs: number | null,
  refreshKey: number,
  enabled = true,
) {
  const [state, setState] = useState<InternalState>(INITIAL);
  const [attempt, setAttempt] = useState(0);

  const queryRef = useRef(query);
  queryRef.current = query;
  const requestKey = `${locationKey(query)}|${targetMs ?? "now"}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `requestKey` (clé stable de `queryRef.current` + `targetMs`), `refreshKey` et `attempt` sont des déclencheurs volontaires de rechargement.
  useEffect(() => {
    if (!hasApiKey || !enabled) return;

    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: "loading", error: null, code: null }));

    getWeatherAt(queryRef.current, targetMs, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ status: "success", data, error: null, code: null, dataKey: requestKey });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState((prev) => {
          const keep = prev.dataKey === requestKey ? prev.data : null;
          return {
            status: "error",
            data: keep,
            error: toUserMessage(error),
            code: error instanceof WeatherError ? error.code : null,
            dataKey: keep ? prev.dataKey : null,
          };
        });
      });

    return () => controller.abort();
  }, [requestKey, refreshKey, attempt, enabled]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status: state.status, data: state.data, error: state.error, code: state.code, retry };
}
