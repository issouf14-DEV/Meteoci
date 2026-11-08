import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CI_UTC_OFFSET_SEC,
  combineLocal,
  formatDateTime,
  formatTime,
  formatUtcOffset,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/date";

/** Décalages UTC (secondes) tels que renvoyés par OpenWeatherMap (`timezone`). */
const ABIDJAN = 0;
const PARIS_HIVER = 3600;
const NEW_YORK_HIVER = -5 * 3600;
const HONOLULU = -10 * 3600;
const KOLKATA = 5.5 * 3600;
const SAINT_JEAN_DE_TERRE_NEUVE = -3.5 * 3600;
const KIRITIMATI = 14 * 3600;

/** 2026-11-08 23:30 UTC : proche de minuit, pour faire basculer la date selon le fuseau. */
const T = Date.UTC(2026, 10, 8, 23, 30);

/**
 * Horizon des prévisions (40 pas de 3 h, marge déduite). Valeur reprise de
 * `FORECAST_HORIZON_MS` (src/lib/weather.ts) sans l'importer : seule la façon
 * dont date.ts borne le sélecteur est testée ici.
 */
const HORIZON_MS = 117 * 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

describe("environnement de test", () => {
  it("simule un navigateur dans un fuseau différent de ceux des villes (America/New_York)", () => {
    // Hiver : UTC-5 ; été : UTC-4. Garantit que les tests détectent toute
    // dépendance accidentelle au fuseau de la machine.
    expect(new Date(Date.UTC(2026, 0, 15)).getTimezoneOffset()).toBe(300);
    expect(new Date(Date.UTC(2026, 6, 15)).getTimezoneOffset()).toBe(240);
  });
});

describe("CI_UTC_OFFSET_SEC", () => {
  it("vaut 0 (Africa/Abidjan, sans heure d'été)", () => {
    expect(CI_UTC_OFFSET_SEC).toBe(0);
  });
});

describe("toDateInputValue / toTimeInputValue", () => {
  it.each([
    ["Abidjan (UTC+0)", ABIDJAN, "2026-11-08", "23:30"],
    ["Paris (UTC+1)", PARIS_HIVER, "2026-11-09", "00:30"],
    ["New York (UTC-5)", NEW_YORK_HIVER, "2026-11-08", "18:30"],
    ["Honolulu (UTC-10)", HONOLULU, "2026-11-08", "13:30"],
    ["Kolkata (UTC+5:30)", KOLKATA, "2026-11-09", "05:00"],
    ["Terre-Neuve (UTC-3:30)", SAINT_JEAN_DE_TERRE_NEUVE, "2026-11-08", "20:00"],
    ["Kiritimati (UTC+14)", KIRITIMATI, "2026-11-09", "13:30"],
  ])("%s : date et heure locales de la ville", (_label, offset, date, time) => {
    expect(toDateInputValue(T, offset)).toBe(date);
    expect(toTimeInputValue(T, offset)).toBe(time);
  });

  it("recule d'un jour (et d'une année) avec un décalage négatif", () => {
    const nouvelAnUtc = Date.UTC(2026, 0, 1, 2, 0);
    expect(toDateInputValue(nouvelAnUtc, ABIDJAN)).toBe("2026-01-01");
    expect(toDateInputValue(nouvelAnUtc, NEW_YORK_HIVER)).toBe("2025-12-31");
    expect(toTimeInputValue(nouvelAnUtc, NEW_YORK_HIVER)).toBe("21:00");
  });

  it("complète par des zéros (format des champs date / heure)", () => {
    const t = Date.UTC(2026, 0, 5, 4, 7);
    expect(toDateInputValue(t, ABIDJAN)).toBe("2026-01-05");
    expect(toTimeInputValue(t, ABIDJAN)).toBe("04:07");
  });

  it("ignore les secondes (troncature, pas d'arrondi)", () => {
    expect(toTimeInputValue(Date.UTC(2026, 0, 5, 4, 7, 59, 999), ABIDJAN)).toBe("04:07");
  });

  it("ne dépend pas du changement d'heure du navigateur (nuit du 1er novembre 2026 à New York)", () => {
    // 05:30 et 06:30 UTC tombent de part et d'autre du passage EDT → EST.
    expect(toTimeInputValue(Date.UTC(2026, 10, 1, 5, 30), ABIDJAN)).toBe("05:30");
    expect(toTimeInputValue(Date.UTC(2026, 10, 1, 6, 30), ABIDJAN)).toBe("06:30");
  });

  it("« aujourd'hui » suit l'heure de la ville et non celle du navigateur (horloge simulée)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(T);
    const now = Date.now();

    // Navigateur à New York : encore le 8 novembre, 18:30.
    expect(new Date(now).getDate()).toBe(8);
    expect(new Date(now).getHours()).toBe(18);

    expect(toDateInputValue(now, ABIDJAN)).toBe("2026-11-08");
    expect(toTimeInputValue(now, ABIDJAN)).toBe("23:30");
    expect(toDateInputValue(now, PARIS_HIVER)).toBe("2026-11-09");
    expect(toTimeInputValue(now, PARIS_HIVER)).toBe("00:30");
  });
});

describe("horizon des prévisions (bornes du sélecteur)", () => {
  const now = Date.UTC(2026, 10, 8, 22, 0);
  const horizon = now + HORIZON_MS; // 2026-11-13 19:00 UTC

  it.each([
    ["Abidjan", ABIDJAN, "2026-11-08", "22:00", "2026-11-13", "19:00"],
    ["Paris", PARIS_HIVER, "2026-11-08", "23:00", "2026-11-13", "20:00"],
    ["New York", NEW_YORK_HIVER, "2026-11-08", "17:00", "2026-11-13", "14:00"],
    ["Kiritimati", KIRITIMATI, "2026-11-09", "12:00", "2026-11-14", "09:00"],
  ])("%s : du jour courant au dernier jour couvert", (_label, offset, minD, minT, maxD, maxT) => {
    expect(toDateInputValue(now, offset)).toBe(minD);
    expect(toTimeInputValue(now, offset)).toBe(minT);
    expect(toDateInputValue(horizon, offset)).toBe(maxD);
    expect(toTimeInputValue(horizon, offset)).toBe(maxT);
  });

  it("la date et l'heure maximales désignent exactement l'horizon", () => {
    for (const offset of [ABIDJAN, PARIS_HIVER, NEW_YORK_HIVER, KOLKATA, KIRITIMATI]) {
      const max = combineLocal(
        toDateInputValue(horizon, offset),
        toTimeInputValue(horizon, offset),
        offset,
      );
      expect(max).toBe(horizon);
    }
  });
});

describe("combineLocal", () => {
  it("convertit une saisie locale en horodatage UTC", () => {
    expect(combineLocal("2026-11-08", "23:30", ABIDJAN)).toBe(T);
    expect(combineLocal("2026-11-09", "00:30", PARIS_HIVER)).toBe(T);
    expect(combineLocal("2026-11-08", "18:30", NEW_YORK_HIVER)).toBe(T);
    expect(combineLocal("2026-11-09", "05:00", KOLKATA)).toBe(T);
    expect(combineLocal("2026-11-08", "20:00", SAINT_JEAN_DE_TERRE_NEUVE)).toBe(T);
  });

  it("est l'inverse de toDateInputValue / toTimeInputValue (à la minute près)", () => {
    const instants = [T, Date.UTC(2026, 0, 1, 0, 0), Date.UTC(2028, 1, 29, 12, 45)];
    const offsets = [ABIDJAN, PARIS_HIVER, NEW_YORK_HIVER, HONOLULU, KOLKATA, KIRITIMATI];
    for (const t of instants) {
      for (const offset of offsets) {
        expect(combineLocal(toDateInputValue(t, offset), toTimeInputValue(t, offset), offset)).toBe(
          t,
        );
      }
    }
  });

  it("accepte une heure inexistante dans le fuseau du navigateur (passage à l'heure d'été)", () => {
    // 2026-03-08 02:30 n'existe pas à New York ; pour Abidjan, c'est une heure valide.
    expect(combineLocal("2026-03-08", "02:30", ABIDJAN)).toBe(Date.UTC(2026, 2, 8, 2, 30));
  });

  it("accepte le 29 février d'une année bissextile", () => {
    expect(combineLocal("2028-02-29", "12:00", ABIDJAN)).toBe(Date.UTC(2028, 1, 29, 12, 0));
  });

  it("accepte les bornes 00:00 et 23:59", () => {
    expect(combineLocal("2026-11-08", "00:00", ABIDJAN)).toBe(Date.UTC(2026, 10, 8));
    expect(combineLocal("2026-11-08", "23:59", ABIDJAN)).toBe(Date.UTC(2026, 10, 8, 23, 59));
  });

  it.each([
    ["date vide", "", "12:00"],
    ["heure vide", "2026-11-08", ""],
    ["31 février", "2026-02-31", "12:00"],
    ["29 février non bissextile", "2026-02-29", "12:00"],
    ["31 avril", "2026-04-31", "12:00"],
    ["mois 00", "2026-00-10", "12:00"],
    ["mois 13", "2026-13-01", "12:00"],
    ["jour 00", "2026-11-00", "12:00"],
    ["jour 32", "2026-11-32", "12:00"],
    ["24:00", "2026-11-08", "24:00"],
    ["minute 60", "2026-11-08", "12:60"],
    ["date sans zéros", "2026-1-5", "12:00"],
    ["heure sans zéro", "2026-11-08", "9:00"],
    ["heure avec secondes", "2026-11-08", "12:00:00"],
    ["format français", "08/11/2026", "12:00"],
    ["date ISO complète", "2026-11-08T12:00", "12:00"],
    ["espaces", " 2026-11-08", "12:00"],
    ["année < 100 (réinterprétée en 19xx par Date.UTC)", "0050-01-01", "12:00"],
  ])("rejette une saisie invalide : %s", (_label, date, time) => {
    expect(combineLocal(date, time, ABIDJAN)).toBeNull();
  });
});

describe("formatTime", () => {
  it("affiche HH:MM dans l'heure de la ville", () => {
    expect(formatTime(T, ABIDJAN)).toBe("23:30");
    expect(formatTime(T, PARIS_HIVER)).toBe("00:30");
    expect(formatTime(T, NEW_YORK_HIVER)).toBe("18:30");
    expect(formatTime(T, KOLKATA)).toBe("05:00");
  });

  it("complète les heures et minutes par des zéros", () => {
    expect(formatTime(Date.UTC(2026, 10, 8, 4, 5), ABIDJAN)).toBe("04:05");
  });
});

describe("formatDateTime", () => {
  it("affiche jour, date et heure en français dans l'heure de la ville", () => {
    expect(formatDateTime(Date.UTC(2026, 10, 8, 14, 0), ABIDJAN)).toBe("dim. 8 nov., 14:00");
  });

  it("change de jour selon le décalage de la ville", () => {
    expect(formatDateTime(T, ABIDJAN)).toBe("dim. 8 nov., 23:30");
    expect(formatDateTime(T, PARIS_HIVER)).toBe("lun. 9 nov., 00:30");
    expect(formatDateTime(T, NEW_YORK_HIVER)).toBe("dim. 8 nov., 18:30");
  });
});

describe("formatUtcOffset", () => {
  it.each([
    [0, "GMT"],
    [3600, "GMT+1"],
    [7200, "GMT+2"],
    [-3 * 3600, "GMT-3"],
    [-5 * 3600, "GMT-5"],
    [-3.5 * 3600, "GMT-3:30"],
    [5.5 * 3600, "GMT+5:30"],
    [5.75 * 3600, "GMT+5:45"],
    [14 * 3600, "GMT+14"],
    [-12 * 3600, "GMT-12"],
  ])("%i s → %s", (offset, label) => {
    expect(formatUtcOffset(offset)).toBe(label);
  });

  it("arrondit à la minute sans produire « :60 »", () => {
    expect(formatUtcOffset(3599)).toBe("GMT+1");
    expect(formatUtcOffset(-3599)).toBe("GMT-1");
    expect(formatUtcOffset(5 * 3600 + 29 * 60 + 50)).toBe("GMT+5:30");
  });
});
