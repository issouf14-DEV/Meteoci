import { z } from "zod";

/**
 * Schémas Zod des réponses OpenWeatherMap (API 2.5).
 * Seuls les champs utilisés par l'application sont décrits ; les champs
 * supplémentaires renvoyés par l'API sont ignorés.
 */

export const owmConditionSchema = z.object({
  id: z.number(),
  main: z.string(),
  description: z.string(),
  icon: z.string(),
});

export const owmMainSchema = z.object({
  temp: z.number(),
  feels_like: z.number(),
  temp_min: z.number(),
  temp_max: z.number(),
  humidity: z.number(),
});

export const owmWindSchema = z.object({
  speed: z.number(),
});

export const owmCurrentResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  dt: z.number(),
  weather: z.array(owmConditionSchema).min(1),
  main: owmMainSchema,
  wind: owmWindSchema.optional(),
  sys: z.object({ country: z.string().optional() }).optional(),
});

export const owmForecastItemSchema = z.object({
  dt: z.number(),
  main: owmMainSchema,
  weather: z.array(owmConditionSchema).min(1),
  wind: owmWindSchema.optional(),
  pop: z.number().optional(),
});

export const owmForecastResponseSchema = z.object({
  list: z.array(owmForecastItemSchema),
});

export type OwmCondition = z.infer<typeof owmConditionSchema>;
export type OwmMain = z.infer<typeof owmMainSchema>;
export type OwmWind = z.infer<typeof owmWindSchema>;
export type OwmCurrentResponse = z.infer<typeof owmCurrentResponseSchema>;
export type OwmForecastItem = z.infer<typeof owmForecastItemSchema>;
export type OwmForecastResponse = z.infer<typeof owmForecastResponseSchema>;

/* -------------------------------------------------------------------------- */
/*                             Recherche de ville                             */
/* -------------------------------------------------------------------------- */

export const CITY_NAME_MAX_LENGTH = 60;

/** Lettres (y compris accentuées), espaces, tirets et apostrophes uniquement. */
const CITY_NAME_PATTERN = /^[\p{L}\p{M}](?:[\p{L}\p{M}\s'’-]*[\p{L}\p{M}])?$/u;

export const cityNameSchema = z
  .string()
  .transform((raw) => raw.normalize("NFC").trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Veuillez saisir le nom d'une ville.")
      .max(
        CITY_NAME_MAX_LENGTH,
        `Le nom de la ville ne doit pas dépasser ${CITY_NAME_MAX_LENGTH} caractères.`,
      )
      .regex(
        CITY_NAME_PATTERN,
        "Seuls les lettres, espaces, tirets et apostrophes sont autorisés.",
      ),
  );

/* -------------------------------------------------------------------------- */
/*                                   Thème                                    */
/* -------------------------------------------------------------------------- */

export const themeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;
