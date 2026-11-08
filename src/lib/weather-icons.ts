import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Cloudy,
  Haze,
  Moon,
  Snowflake,
  Sun,
  Tornado,
  Wind,
  type LucideIcon,
} from "lucide-react";

export interface WeatherVisual {
  Icon: LucideIcon;
  /** Couleur de l'icône. */
  color: string;
  /** Fond teinté de la pastille. */
  bg: string;
  /** Dégradé de la barre d'accent en haut de la carte. */
  bar: string;
  /** Animation douce (transform uniquement). */
  motion: "spin" | "float" | "none";
}

const SUN: WeatherVisual = {
  Icon: Sun,
  color: "text-amber-500 dark:text-amber-400",
  bg: "bg-amber-400/15",
  bar: "from-amber-300 to-orange-400",
  motion: "spin",
};
const MOON: WeatherVisual = {
  Icon: Moon,
  color: "text-indigo-400 dark:text-indigo-300",
  bg: "bg-indigo-400/15",
  bar: "from-indigo-400 to-blue-600",
  motion: "float",
};
const PARTLY: WeatherVisual = {
  Icon: CloudSun,
  color: "text-amber-500 dark:text-amber-300",
  bg: "bg-amber-300/15",
  bar: "from-amber-300 to-sky-400",
  motion: "float",
};
const PARTLY_NIGHT: WeatherVisual = { ...MOON, Icon: CloudMoon, bar: "from-indigo-300 to-slate-400" };
const CLOUD: WeatherVisual = {
  Icon: Cloud,
  color: "text-slate-500 dark:text-slate-300",
  bg: "bg-slate-400/15",
  bar: "from-slate-300 to-slate-500",
  motion: "float",
};
const OVERCAST: WeatherVisual = { ...CLOUD, Icon: Cloudy, bar: "from-slate-400 to-slate-600" };
const DRIZZLE: WeatherVisual = {
  Icon: CloudDrizzle,
  color: "text-sky-500 dark:text-sky-400",
  bg: "bg-sky-400/15",
  bar: "from-sky-300 to-sky-500",
  motion: "float",
};
const RAIN: WeatherVisual = {
  Icon: CloudRain,
  color: "text-blue-500 dark:text-blue-400",
  bg: "bg-blue-500/15",
  bar: "from-blue-400 to-cyan-600",
  motion: "float",
};
const HEAVY_RAIN: WeatherVisual = { ...RAIN, Icon: CloudRainWind, bar: "from-blue-500 to-indigo-700" };
const THUNDER: WeatherVisual = {
  Icon: CloudLightning,
  color: "text-purple-500 dark:text-purple-400",
  bg: "bg-purple-500/15",
  bar: "from-purple-500 to-indigo-700",
  motion: "float",
};
const SNOW: WeatherVisual = {
  Icon: Snowflake,
  color: "text-cyan-500 dark:text-cyan-300",
  bg: "bg-cyan-300/15",
  bar: "from-cyan-200 to-sky-400",
  motion: "spin",
};
const SLEET: WeatherVisual = { ...SNOW, Icon: CloudSnow, motion: "float" };
const FOG: WeatherVisual = {
  Icon: CloudFog,
  color: "text-slate-400 dark:text-slate-300",
  bg: "bg-slate-300/20",
  bar: "from-slate-200 to-slate-400",
  motion: "float",
};
const HAZE: WeatherVisual = {
  Icon: Haze,
  color: "text-orange-400 dark:text-orange-300",
  bg: "bg-orange-300/15",
  bar: "from-orange-200 to-amber-400",
  motion: "float",
};
const SMOKE: WeatherVisual = { ...HAZE, color: "text-gray-500 dark:text-gray-400", bg: "bg-gray-400/15", bar: "from-gray-300 to-gray-500" };
const DUST: WeatherVisual = {
  Icon: Wind,
  color: "text-yellow-600 dark:text-yellow-500",
  bg: "bg-yellow-500/15",
  bar: "from-yellow-300 to-amber-600",
  motion: "float",
};
const SQUALL: WeatherVisual = { ...DUST, color: "text-sky-400", bg: "bg-sky-300/15", bar: "from-sky-200 to-sky-500" };
const TORNADO: WeatherVisual = {
  Icon: Tornado,
  color: "text-red-500",
  bg: "bg-red-500/15",
  bar: "from-red-400 to-rose-600",
  motion: "float",
};

/** Correspondances exactes par identifiant de condition OpenWeatherMap. */
const BY_ID = new Map<number, WeatherVisual>([
  [511, SLEET],
  [701, FOG],
  [711, SMOKE],
  [721, HAZE],
  [731, DUST],
  [741, FOG],
  [751, DUST],
  [761, DUST],
  [762, SMOKE],
  [771, SQUALL],
  [781, TORNADO],
  [803, CLOUD],
  [804, OVERCAST],
]);

/** Repli par libellé `main` (au cas où l'identifiant serait absent). */
const BY_MAIN = new Map<string, WeatherVisual>([
  ["clear", SUN],
  ["clouds", CLOUD],
  ["rain", RAIN],
  ["drizzle", DRIZZLE],
  ["thunderstorm", THUNDER],
  ["snow", SNOW],
  ["mist", FOG],
  ["fog", FOG],
  ["haze", HAZE],
  ["smoke", SMOKE],
  ["dust", DUST],
  ["sand", DUST],
  ["ash", SMOKE],
  ["squall", SQUALL],
  ["tornado", TORNADO],
]);

export function getWeatherVisual(conditionId: number, main: string, iconCode = ""): WeatherVisual {
  const isNight = iconCode.endsWith("n");

  const exact = BY_ID.get(conditionId);
  if (exact) return exact;

  if (conditionId >= 200 && conditionId < 300) return THUNDER;
  if (conditionId >= 300 && conditionId < 400) return DRIZZLE;
  if (conditionId >= 500 && conditionId < 600) return conditionId >= 502 ? HEAVY_RAIN : RAIN;
  if (conditionId >= 600 && conditionId < 700) return SNOW;
  if (conditionId >= 700 && conditionId < 800) return FOG;
  if (conditionId === 800) return isNight ? MOON : SUN;
  if (conditionId === 801 || conditionId === 802) return isNight ? PARTLY_NIGHT : PARTLY;

  return BY_MAIN.get(main.toLowerCase()) ?? PARTLY;
}
