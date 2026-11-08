import { useSyncExternalStore } from "react";

import { isWeatherServiceAvailable, subscribeWeatherService } from "@/lib/weather";

/** Faux dès que le proxy météo signale qu'il n'est pas configuré (clé serveur absente). */
export function useWeatherServiceAvailable(): boolean {
  return useSyncExternalStore(subscribeWeatherService, isWeatherServiceAvailable, () => true);
}
