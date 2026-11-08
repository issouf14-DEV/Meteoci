/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse du proxy météo (optionnelle, "/api/weather" par défaut). */
  readonly VITE_WEATHER_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
