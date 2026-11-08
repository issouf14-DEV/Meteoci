import { describe, expect, it } from "vitest";

import {
  cityNameSchema,
  owmCurrentResponseSchema,
  owmForecastItemSchema,
  owmForecastResponseSchema,
  themeSchema,
} from "@/lib/schemas";

/** Réponse réaliste de /data/2.5/weather (Abidjan), champs inutilisés compris. */
function currentPayload() {
  return {
    coord: { lon: -4.0083, lat: 5.3544 },
    weather: [{ id: 802, main: "Clouds", description: "partiellement nuageux", icon: "03d" }],
    base: "stations",
    main: {
      temp: 30.97,
      feels_like: 36.42,
      temp_min: 30.97,
      temp_max: 30.97,
      pressure: 1010,
      humidity: 62,
      sea_level: 1010,
      grnd_level: 1009,
    },
    visibility: 10000,
    wind: { speed: 4.63, deg: 210, gust: 6.1 },
    clouds: { all: 40 },
    dt: 1_794_150_000,
    sys: { type: 1, id: 1137, country: "CI", sunrise: 1_794_117_300, sunset: 1_794_160_200 },
    timezone: 0,
    id: 2_293_538,
    name: "Abidjan",
    cod: 200,
  };
}

/** Élément réaliste de /data/2.5/forecast. */
function forecastItem(dt: number) {
  return {
    dt,
    main: {
      temp: 27.4,
      feels_like: 30.1,
      temp_min: 26.9,
      temp_max: 27.4,
      pressure: 1011,
      sea_level: 1011,
      grnd_level: 1010,
      humidity: 81,
      temp_kf: 0.5,
    },
    weather: [{ id: 500, main: "Rain", description: "légère pluie", icon: "10n" }],
    clouds: { all: 75 },
    wind: { speed: 3.2, deg: 220, gust: 4.8 },
    visibility: 10000,
    pop: 0.42,
    rain: { "3h": 0.6 },
    sys: { pod: "n" },
    dt_txt: "2026-11-08 21:00:00",
  };
}

function forecastPayload() {
  return {
    cod: "200",
    message: 0,
    cnt: 2,
    list: [forecastItem(1_794_171_600), forecastItem(1_794_182_400)],
    city: { id: 2_293_538, name: "Abidjan", country: "CI", timezone: 0 },
  };
}

describe("owmCurrentResponseSchema", () => {
  it("accepte une réponse OpenWeatherMap réelle", () => {
    const result = owmCurrentResponseSchema.safeParse(currentPayload());
    expect(result.success).toBe(true);
  });

  it("ne conserve que les champs utilisés (clés inconnues supprimées)", () => {
    const result = owmCurrentResponseSchema.safeParse(currentPayload());
    if (!result.success) throw result.error;
    expect(result.data).toEqual({
      id: 2_293_538,
      name: "Abidjan",
      dt: 1_794_150_000,
      weather: [{ id: 802, main: "Clouds", description: "partiellement nuageux", icon: "03d" }],
      main: { temp: 30.97, feels_like: 36.42, temp_min: 30.97, temp_max: 30.97, humidity: 62 },
      wind: { speed: 4.63 },
      sys: { country: "CI" },
    });
  });

  it("accepte l'absence des champs facultatifs (vent, sys, pays)", () => {
    const { wind: _wind, sys: _sys, ...withoutOptional } = currentPayload();
    expect(owmCurrentResponseSchema.safeParse(withoutOptional).success).toBe(true);
    expect(owmCurrentResponseSchema.safeParse({ ...currentPayload(), sys: {} }).success).toBe(true);
  });

  it.each(["id", "name", "dt", "weather", "main"] as const)(
    "rejette l'absence de « %s »",
    (key) => {
      const payload: Record<string, unknown> = currentPayload();
      delete payload[key];
      expect(owmCurrentResponseSchema.safeParse(payload).success).toBe(false);
    },
  );

  it("rejette une liste de conditions vide", () => {
    expect(owmCurrentResponseSchema.safeParse({ ...currentPayload(), weather: [] }).success).toBe(
      false,
    );
  });

  it("rejette des types invalides", () => {
    const base = currentPayload();
    const invalid = [
      { ...base, main: { ...base.main, temp: "30.97" } },
      { ...base, main: { ...base.main, humidity: null } },
      { ...base, dt: "1794150000" },
      { ...base, name: 42 },
      { ...base, weather: [{ ...base.weather[0], id: "802" }] },
      { ...base, weather: [{ main: "Clouds", description: "x", icon: "03d" }] },
      { ...base, wind: { speed: "fort" } },
      { ...base, sys: { country: 225 } },
    ];
    for (const payload of invalid) {
      expect(owmCurrentResponseSchema.safeParse(payload).success).toBe(false);
    }
  });

  it("rejette une réponse d'erreur de l'API et les valeurs non-objets", () => {
    for (const payload of [
      { cod: "404", message: "city not found" },
      { cod: 401, message: "Invalid API key." },
      null,
      undefined,
      "Abidjan",
      [],
    ]) {
      expect(owmCurrentResponseSchema.safeParse(payload).success).toBe(false);
    }
  });
});

describe("owmForecastResponseSchema", () => {
  it("accepte une réponse OpenWeatherMap réelle et supprime les clés inconnues", () => {
    const result = owmForecastResponseSchema.safeParse(forecastPayload());
    if (!result.success) throw result.error;
    expect(Object.keys(result.data)).toEqual(["list"]);
    expect(result.data.list).toHaveLength(2);
    expect(result.data.list[0]).toEqual({
      dt: 1_794_171_600,
      main: { temp: 27.4, feels_like: 30.1, temp_min: 26.9, temp_max: 27.4, humidity: 81 },
      weather: [{ id: 500, main: "Rain", description: "légère pluie", icon: "10n" }],
      wind: { speed: 3.2 },
      pop: 0.42,
    });
  });

  it("accepte une liste vide", () => {
    expect(owmForecastResponseSchema.safeParse({ list: [] }).success).toBe(true);
  });

  it("rejette l'absence de liste ou une liste qui n'est pas un tableau", () => {
    expect(owmForecastResponseSchema.safeParse({ cod: "200" }).success).toBe(false);
    expect(owmForecastResponseSchema.safeParse({ list: {} }).success).toBe(false);
  });

  it("rejette la réponse entière si un seul élément est invalide", () => {
    const payload = forecastPayload();
    const { main: _main, ...broken } = forecastItem(1_794_193_200);
    expect(
      owmForecastResponseSchema.safeParse({ ...payload, list: [...payload.list, broken] }),
    ).toMatchObject({ success: false });
  });
});

describe("owmForecastItemSchema", () => {
  it("accepte l'absence de « pop » et de « wind »", () => {
    const { pop: _pop, wind: _wind, ...item } = forecastItem(1);
    expect(owmForecastItemSchema.safeParse(item).success).toBe(true);
  });

  it("rejette une probabilité de pluie non numérique", () => {
    expect(owmForecastItemSchema.safeParse({ ...forecastItem(1), pop: "42%" }).success).toBe(false);
  });

  it("rejette une liste de conditions vide", () => {
    expect(owmForecastItemSchema.safeParse({ ...forecastItem(1), weather: [] }).success).toBe(
      false,
    );
  });
});

describe("themeSchema", () => {
  it.each(["light", "dark"])("accepte « %s »", (value) => {
    expect(themeSchema.safeParse(value)).toEqual({ success: true, data: value });
  });

  it.each(["Dark", "LIGHT", "system", "", " dark", null, undefined, 1, {}])(
    "rejette %j",
    (value) => {
      expect(themeSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("cityNameSchema", () => {
  it("rejette les valeurs qui ne sont pas des chaînes", () => {
    for (const value of [null, undefined, 42, ["Abidjan"], { name: "Abidjan" }]) {
      expect(cityNameSchema.safeParse(value).success).toBe(false);
    }
  });

  it("renvoie la valeur normalisée", () => {
    expect(cityNameSchema.parse("  Grand   Bassam ")).toBe("Grand Bassam");
  });
});
