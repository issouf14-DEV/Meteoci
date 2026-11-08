import { z } from "@/lib/zod";

/** Clé OpenWeatherMap : 32 caractères hexadécimaux. */
const apiKeySchema = z
  .string()
  .check(z.trim(), z.regex(/^[a-f0-9]{32}$/i, "Clé API OpenWeatherMap invalide"));

const parsedKey = apiKeySchema.safeParse(import.meta.env.VITE_OWM_API_KEY);

/** Clé API validée, ou chaîne vide si absente / mal formée. */
export const API_KEY: string = parsedKey.success ? parsedKey.data : "";
export const hasApiKey = parsedKey.success;
