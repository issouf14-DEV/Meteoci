import { CI_UTC_OFFSET_SEC } from "@/lib/date";
import type { LocationQuery } from "@/lib/weather";

export interface City {
  /** Identifiant stable, jamais dérivé d'une saisie utilisateur. */
  id: string;
  name: string;
  region: string;
  query: LocationQuery;
  /** Ville ajoutée via la recherche (supprimable). */
  dynamic?: boolean;
  country?: string;
  /** Décalage UTC en secondes (heure locale de la ville). */
  utcOffsetSec: number;
}

/**
 * Villes prédéfinies, interrogées par coordonnées : le géocodage intégré par
 * nom d'OpenWeatherMap est déprécié et sensible aux accents (« San-Pédro »).
 */
const PRESETS: ReadonlyArray<{
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
}> = [
  { id: "abidjan", name: "Abidjan", region: "Sud", lat: 5.36, lon: -4.0083 },
  { id: "bouake", name: "Bouaké", region: "Centre", lat: 7.6939, lon: -5.0303 },
  { id: "korhogo", name: "Korhogo", region: "Nord", lat: 9.458, lon: -5.6296 },
  { id: "yakro", name: "Yamoussoukro", region: "Centre", lat: 6.8276, lon: -5.2893 },
  { id: "man", name: "Man", region: "Ouest", lat: 7.4125, lon: -7.5538 },
  { id: "daloa", name: "Daloa", region: "Centre-Ouest", lat: 6.8774, lon: -6.4502 },
  { id: "sanpedro", name: "San-Pédro", region: "Sud-Ouest", lat: 4.7485, lon: -6.6363 },
  { id: "ferkessedougou", name: "Ferkessédougou", region: "Nord", lat: 9.5928, lon: -5.1944 },
  { id: "gagnoa", name: "Gagnoa", region: "Centre-Ouest", lat: 6.1319, lon: -5.9506 },
  { id: "odienne", name: "Odienné", region: "Nord-Ouest", lat: 9.5051, lon: -7.5643 },
  { id: "bondoukou", name: "Bondoukou", region: "Est", lat: 8.0402, lon: -2.8 },
  { id: "divo", name: "Divo", region: "Sud", lat: 5.8372, lon: -5.3572 },
  { id: "soubre", name: "Soubré", region: "Sud-Ouest", lat: 5.7856, lon: -6.6083 },
  { id: "adzope", name: "Adzopé", region: "Sud-Est", lat: 6.1067, lon: -3.8603 },
  { id: "abengourou", name: "Abengourou", region: "Est", lat: 6.7297, lon: -3.4964 },
];

export const CITIES: ReadonlyArray<City> = PRESETS.map(({ lat, lon, ...c }) => ({
  ...c,
  query: { lat, lon },
  utcOffsetSec: CI_UTC_OFFSET_SEC,
}));

/** Normalise un nom pour comparaison (sans accents, casse, tirets). */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[-'’\s]+/g, " ")
    .trim();
}

/** Identifiant OpenWeatherMap d'une ville (villes ajoutées), sinon null. */
export const owmIdOf = (city: City): number | null => ("id" in city.query ? city.query.id : null);

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
