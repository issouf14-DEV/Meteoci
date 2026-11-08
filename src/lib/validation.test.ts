import { describe, expect, it } from "vitest";

import {
  CITY_NAME_MAX_LENGTH,
  CITY_NAME_MIN_LENGTH,
  MAX_DYNAMIC_CITIES,
  validateCityName,
} from "@/lib/validation";

const MSG_EMPTY = "Veuillez saisir le nom d'une ville.";
const MSG_MIN = "Le nom de la ville doit contenir au moins 2 caractères.";
const MSG_MAX = "Le nom de la ville ne doit pas dépasser 60 caractères.";
const MSG_CHARS =
  "Seuls les lettres (accents compris), espaces, tirets et apostrophes sont autorisés.";

describe("constantes", () => {
  it("bornes de longueur du nom de ville : 2 à 60 caractères", () => {
    expect(CITY_NAME_MIN_LENGTH).toBe(2);
    expect(CITY_NAME_MAX_LENGTH).toBe(60);
  });

  it("limite le nombre de villes ajoutées par recherche à 10", () => {
    expect(MAX_DYNAMIC_CITIES).toBe(10);
  });
});

describe("validateCityName : noms acceptés", () => {
  it.each([
    "Abidjan",
    "Bouaké",
    "Yamoussoukro",
    "Grand-Bassam",
    "San Pedro",
    "M'Bahiakro",
    "M’Bahiakro",
    "Saint-Étienne",
    "Ab",
    "Ñuñoa",
    "Москва",
    "東京",
  ])("%s", (name) => {
    expect(validateCityName(name)).toEqual({ ok: true, value: name });
  });

  it("supprime les espaces de début / fin et réduit les espaces multiples", () => {
    expect(validateCityName("   San \t  Pedro  ")).toEqual({ ok: true, value: "San Pedro" });
    expect(validateCityName("Grand\n Bassam")).toEqual({ ok: true, value: "Grand Bassam" });
  });

  it("normalise en NFC (accent décomposé → caractère précomposé)", () => {
    const decomposed = "Bouaké";
    const result = validateCityName(decomposed);
    expect(result).toEqual({ ok: true, value: "Bouaké" });
    expect(result.ok && result.value.length).toBe(6);
  });

  it("accepte exactement 60 caractères", () => {
    const name = "a".repeat(CITY_NAME_MAX_LENGTH);
    expect(validateCityName(name)).toEqual({ ok: true, value: name });
  });
});

describe("validateCityName : saisies rejetées", () => {
  it.each([
    ["chaîne vide", "", MSG_EMPTY],
    ["espaces seuls", "   \t ", MSG_EMPTY],
    ["une seule lettre", "A", MSG_MIN],
    ["une lettre entourée d'espaces", "  A  ", MSG_MIN],
    ["61 caractères", "a".repeat(61), MSG_MAX],
    ["chiffres", "Paris75", MSG_CHARS],
    ["code postal seul", "75001", MSG_CHARS],
    ["balise script", "<script>alert(1)</script>", MSG_CHARS],
    ["chevrons", "Abidjan<b>", MSG_CHARS],
    ["guillemets", 'Abi"djan', MSG_CHARS],
    ["point-virgule", "Abidjan;DROP", MSG_CHARS],
    ["virgule (ville, pays)", "Paris,FR", MSG_CHARS],
    ["point", "St. Louis", MSG_CHARS],
    ["tiret initial", "-Abidjan", MSG_CHARS],
    ["tiret final", "Abidjan-", MSG_CHARS],
    ["apostrophe initiale", "'Abidjan", MSG_CHARS],
    ["apostrophe seule doublée", "''", MSG_CHARS],
    ["emoji", "Abidjan 🌴", MSG_CHARS],
    ["chiffres arabes-indiens", "مدينة٣", MSG_CHARS],
  ])("%s", (_label, raw, error) => {
    expect(validateCityName(raw)).toEqual({ ok: false, error });
  });

  it("vérifie la longueur après normalisation des espaces", () => {
    const padded = `  ${"a".repeat(CITY_NAME_MAX_LENGTH)}  `;
    expect(validateCityName(padded).ok).toBe(true);
  });
});
