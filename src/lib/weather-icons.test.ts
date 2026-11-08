import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, Moon, Sun, Zap } from "lucide-react";
import { describe, expect, it } from "vitest";

import { getWeatherVisual, MOTION_CLASS } from "@/lib/weather-icons";

describe("getWeatherVisual : identifiants OpenWeatherMap", () => {
  it.each([
    [200, "Thunderstorm", "thunder"],
    [232, "Thunderstorm", "thunder"],
    [300, "Drizzle", "drizzle"],
    [321, "Drizzle", "drizzle"],
    [500, "Rain", "rain"],
    [531, "Rain", "rain"],
    [511, "Rain", "snow"], // pluie verglaçante
    [600, "Snow", "snow"],
    [622, "Snow", "snow"],
    [701, "Mist", "mist"],
    [711, "Smoke", "smoke"],
    [721, "Haze", "haze"],
    [731, "Dust", "dust"],
    [741, "Fog", "mist"],
    [751, "Sand", "dust"],
    [761, "Dust", "dust"],
    [762, "Ash", "smoke"],
    [771, "Squall", "squall"],
    [781, "Tornado", "tornado"],
    [799, "Inconnu", "mist"], // groupe 7xx sans correspondance exacte
    [801, "Clouds", "clouds"],
    [804, "Clouds", "clouds"],
  ])("%i (%s) → %s", (id, main, tone) => {
    expect(getWeatherVisual(id, main).tone).toBe(tone);
  });

  it("choisit l'icône selon le groupe", () => {
    expect(getWeatherVisual(211, "Thunderstorm").Icon).toBe(Zap);
    expect(getWeatherVisual(301, "Drizzle").Icon).toBe(CloudDrizzle);
    expect(getWeatherVisual(501, "Rain").Icon).toBe(CloudRain);
    expect(getWeatherVisual(511, "Rain").Icon).toBe(CloudSnow);
    expect(getWeatherVisual(741, "Fog").Icon).toBe(CloudFog);
    expect(getWeatherVisual(803, "Clouds").Icon).toBe(Cloud);
  });

  it("ciel dégagé : soleil le jour, lune la nuit", () => {
    expect(getWeatherVisual(800, "Clear", "01d")).toMatchObject({ Icon: Sun, tone: "sun" });
    expect(getWeatherVisual(800, "Clear", "01n")).toMatchObject({ Icon: Moon, tone: "moon" });
    expect(getWeatherVisual(800, "Clear").Icon).toBe(Sun);
  });

  it("les tracés ouverts (pluie, brume) ne sont pas remplis", () => {
    expect(getWeatherVisual(800, "Clear").filled).toBe(true);
    expect(getWeatherVisual(500, "Rain").filled).toBe(false);
    expect(getWeatherVisual(701, "Mist").filled).toBe(false);
  });

  it("l'identifiant prime sur le libellé", () => {
    expect(getWeatherVisual(500, "Clear").tone).toBe("rain");
  });
});

describe("getWeatherVisual : repli par libellé « main »", () => {
  it.each([
    ["Clear", "sun"],
    ["clouds", "clouds"],
    ["RAIN", "rain"],
    ["Drizzle", "drizzle"],
    ["Thunderstorm", "thunder"],
    ["Snow", "snow"],
    ["Mist", "mist"],
    ["Fog", "mist"],
    ["Haze", "haze"],
    ["Smoke", "smoke"],
    ["Dust", "dust"],
    ["Sand", "dust"],
    ["Ash", "smoke"],
    ["Squall", "squall"],
    ["Tornado", "tornado"],
  ])("identifiant hors plage, main « %s » → %s", (main, tone) => {
    expect(getWeatherVisual(0, main).tone).toBe(tone);
    expect(getWeatherVisual(950, main).tone).toBe(tone);
  });

  it("nuages par défaut pour un libellé inconnu ou vide", () => {
    expect(getWeatherVisual(0, "Volcan").tone).toBe("clouds");
    expect(getWeatherVisual(0, "").tone).toBe("clouds");
    expect(getWeatherVisual(Number.NaN, "").tone).toBe("clouds");
    expect(getWeatherVisual(-1, "").tone).toBe("clouds");
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "prototype"])(
    "une clé du prototype (« %s ») ne correspond à rien",
    (main) => {
      const visual = getWeatherVisual(0, main);
      expect(visual.tone).toBe("clouds");
      expect(visual.Icon).toBe(Cloud);
      expect(typeof visual.motion).toBe("string");
    },
  );
});

describe("MOTION_CLASS", () => {
  it("associe chaque animation à sa classe CSS", () => {
    expect(MOTION_CLASS).toEqual({
      sun: "weather-icon-sun",
      rain: "weather-icon-rain",
      cloud: "weather-icon-cloud",
      float: "weather-icon-float",
    });
  });

  it("toute icône renvoyée a une classe d'animation définie", () => {
    for (const id of [200, 300, 500, 511, 600, 701, 711, 721, 731, 771, 781, 800, 801]) {
      const { motion } = getWeatherVisual(id, "");
      expect(Object.hasOwn(MOTION_CLASS, motion)).toBe(true);
    }
  });
});
