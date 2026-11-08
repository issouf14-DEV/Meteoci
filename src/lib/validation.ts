export const CITY_NAME_MAX_LENGTH = 60;

/** Lettres (y compris accentuées), espaces, tirets et apostrophes uniquement. */
const CITY_NAME_PATTERN = /^[\p{L}\p{M}](?:[\p{L}\p{M}\s'’-]*[\p{L}\p{M}])?$/u;

export type CityNameValidation = { ok: true; value: string } | { ok: false; error: string };

export function validateCityName(raw: string): CityNameValidation {
  const value = raw.normalize("NFC").trim().replace(/\s+/g, " ");

  if (value.length === 0) {
    return { ok: false, error: "Veuillez saisir le nom d'une ville." };
  }
  if (value.length < 2) {
    return { ok: false, error: "Le nom de la ville doit contenir au moins 2 caractères." };
  }
  if (value.length > CITY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le nom de la ville ne doit pas dépasser ${CITY_NAME_MAX_LENGTH} caractères.`,
    };
  }
  if (!CITY_NAME_PATTERN.test(value)) {
    return {
      ok: false,
      error: "Seuls les lettres, espaces, tirets et apostrophes sont autorisés.",
    };
  }
  return { ok: true, value };
}
