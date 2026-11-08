import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudRain,
  CloudSnow,
  type LucideIcon,
  Moon,
  Snowflake,
  Sun,
  Tornado,
  Wind,
  Zap,
} from "lucide-react";

/**
 * Teinte de la pastille (couleur de l'icône + bordure), reprise de
 * WEATHER_ICONS de la version d'origine. Voir `data-tone` dans legacy.css.
 */
export type WeatherTone =
  | "sun"
  | "moon"
  | "clouds"
  | "rain"
  | "drizzle"
  | "thunder"
  | "snow"
  | "mist"
  | "haze"
  | "dust"
  | "smoke"
  | "squall"
  | "tornado";

/** Animation de l'icône (getWeatherAnimation de la version d'origine). */
export type WeatherMotion = "sun" | "rain" | "cloud" | "float";

export interface WeatherVisual {
  Icon: LucideIcon;
  tone: WeatherTone;
  motion: WeatherMotion;
  /** Icône pleine (comme les icônes « solid » de l'original) ; non pour les tracés ouverts. */
  filled: boolean;
}

const SUN: WeatherVisual = { Icon: Sun, tone: "sun", motion: "sun", filled: true };
const MOON: WeatherVisual = { Icon: Moon, tone: "moon", motion: "float", filled: true };
const CLOUDS: WeatherVisual = { Icon: Cloud, tone: "clouds", motion: "cloud", filled: true };
const RAIN: WeatherVisual = { Icon: CloudRain, tone: "rain", motion: "rain", filled: false };
const DRIZZLE: WeatherVisual = {
  Icon: CloudDrizzle,
  tone: "drizzle",
  motion: "rain",
  filled: false,
};
const THUNDER: WeatherVisual = { Icon: Zap, tone: "thunder", motion: "float", filled: true };
const SNOW: WeatherVisual = { Icon: Snowflake, tone: "snow", motion: "float", filled: false };
const SLEET: WeatherVisual = { Icon: CloudSnow, tone: "snow", motion: "float", filled: false };
const MIST: WeatherVisual = { Icon: CloudFog, tone: "mist", motion: "cloud", filled: false };
const HAZE: WeatherVisual = { Icon: CloudFog, tone: "haze", motion: "cloud", filled: false };
const SMOKE: WeatherVisual = { Icon: CloudFog, tone: "smoke", motion: "float", filled: false };
const DUST: WeatherVisual = { Icon: Wind, tone: "dust", motion: "float", filled: false };
const SQUALL: WeatherVisual = { Icon: Wind, tone: "squall", motion: "float", filled: false };
const TORNADO: WeatherVisual = { Icon: Tornado, tone: "tornado", motion: "float", filled: false };

/** Correspondances exactes par identifiant de condition OpenWeatherMap. */
const BY_ID = new Map<number, WeatherVisual>([
  [511, SLEET],
  [701, MIST],
  [711, SMOKE],
  [721, HAZE],
  [731, DUST],
  [741, MIST],
  [751, DUST],
  [761, DUST],
  [762, SMOKE],
  [771, SQUALL],
  [781, TORNADO],
]);

/** Repli par libellé `main` (au cas où l'identifiant serait absent). */
const BY_MAIN = new Map<string, WeatherVisual>([
  ["clear", SUN],
  ["clouds", CLOUDS],
  ["rain", RAIN],
  ["drizzle", DRIZZLE],
  ["thunderstorm", THUNDER],
  ["snow", SNOW],
  ["mist", MIST],
  ["fog", MIST],
  ["haze", HAZE],
  ["smoke", SMOKE],
  ["dust", DUST],
  ["sand", DUST],
  ["ash", SMOKE],
  ["squall", SQUALL],
  ["tornado", TORNADO],
]);

export function getWeatherVisual(conditionId: number, main: string, iconCode = ""): WeatherVisual {
  const exact = BY_ID.get(conditionId);
  if (exact) return exact;

  if (conditionId >= 200 && conditionId < 300) return THUNDER;
  if (conditionId >= 300 && conditionId < 400) return DRIZZLE;
  if (conditionId >= 500 && conditionId < 600) return RAIN;
  if (conditionId >= 600 && conditionId < 700) return SNOW;
  if (conditionId >= 700 && conditionId < 800) return MIST;
  // Ciel dégagé la nuit : lune plutôt que soleil.
  if (conditionId === 800) return iconCode.endsWith("n") ? MOON : SUN;
  if (conditionId > 800 && conditionId < 900) return CLOUDS;

  return BY_MAIN.get(main.toLowerCase()) ?? CLOUDS;
}

/** Classe CSS d'animation de l'icône (legacy.css). */
export const MOTION_CLASS: Record<WeatherMotion, string> = {
  sun: "weather-icon-sun",
  rain: "weather-icon-rain",
  cloud: "weather-icon-cloud",
  float: "weather-icon-float",
};
