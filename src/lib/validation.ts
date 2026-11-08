import { CITY_NAME_MAX_LENGTH, CITY_NAME_MIN_LENGTH, cityNameSchema } from "@/lib/schemas";

export { CITY_NAME_MAX_LENGTH, CITY_NAME_MIN_LENGTH };

/** Nombre maximal de villes ajoutées par recherche (limite les appels à l'API). */
export const MAX_DYNAMIC_CITIES = 10;

export type CityNameValidation = { ok: true; value: string } | { ok: false; error: string };

/** Valide une saisie de recherche ; renvoie le premier message d'erreur (français). */
export function validateCityName(raw: string): CityNameValidation {
  const result = cityNameSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return {
    ok: false,
    error: result.error.issues[0]?.message ?? "Nom de ville invalide.",
  };
}
