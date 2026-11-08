import type { LocationQuery } from "@/lib/weather";

export interface City {
  /** Identifiant stable, jamais dérivé d'une saisie utilisateur. */
  id: string;
  name: string;
  region: string;
  query: LocationQuery;
  /** Ville ajoutée via la recherche (supprimable). */
  dynamic?: boolean;
  /** Identifiant OpenWeatherMap (villes dynamiques). */
  owmId?: number;
  country?: string;
}

const PRESETS: ReadonlyArray<{ id: string; name: string; region: string }> = [
  { id: "abidjan", name: "Abidjan", region: "Sud" },
  { id: "bouake", name: "Bouaké", region: "Centre" },
  { id: "korhogo", name: "Korhogo", region: "Nord" },
  { id: "yakro", name: "Yamoussoukro", region: "Centre" },
  { id: "man", name: "Man", region: "Ouest" },
  { id: "daloa", name: "Daloa", region: "Centre-Ouest" },
  { id: "sanpedro", name: "San-Pédro", region: "Sud-Ouest" },
  { id: "ferkessedougou", name: "Ferkessédougou", region: "Nord" },
  { id: "gagnoa", name: "Gagnoa", region: "Centre-Ouest" },
  { id: "odienne", name: "Odienné", region: "Nord-Ouest" },
  { id: "bondoukou", name: "Bondoukou", region: "Est" },
  { id: "divo", name: "Divo", region: "Sud" },
  { id: "soubre", name: "Soubré", region: "Sud-Ouest" },
  { id: "adzope", name: "Adzopé", region: "Sud-Est" },
  { id: "abengourou", name: "Abengourou", region: "Est" },
];

export const CITIES: ReadonlyArray<City> = PRESETS.map((c) => ({
  ...c,
  query: { q: `${c.name},CI` },
}));

/** Normalise un nom pour comparaison (sans accents, casse, tirets). */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-'’\s]+/g, " ")
    .trim();
}

let dynamicCounter = 0;

/** Génère un identifiant stable et non dérivé de la saisie. */
export function createCityId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `dyn-${crypto.randomUUID()}`;
    }
  } catch {
    /* contexte non sécurisé : repli sur le compteur */
  }
  dynamicCounter += 1;
  return `dyn-${Date.now().toString(36)}-${dynamicCounter}`;
}
