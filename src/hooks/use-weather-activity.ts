import { useSyncExternalStore } from "react";

import { getWeatherActivity, subscribeWeatherActivity } from "@/lib/weather";

/** Nombre de requêtes météo en cours ou en attente (0 = au repos). */
export function useWeatherActivity(): number {
  return useSyncExternalStore(subscribeWeatherActivity, getWeatherActivity, () => 0);
}
