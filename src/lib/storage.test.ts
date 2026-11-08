import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { purgeLegacyStorage, safeGetItem, safeSetItem } from "@/lib/storage";

const LEGACY_KEYS = [
  "auth_attempts",
  "auth_session",
  "newsletter_subs",
  "newsletter_rate",
  "meteoUser",
];
const PURGE_FLAG = "meteoLegacyPurgeV1";

/**
 * Storage en mémoire substitué à window.localStorage. Celui de happy-dom est un
 * Proxy qui lie ses méthodes à l'instance : on ne peut pas l'espionner de façon
 * fiable (vi.spyOn ne serait ni appliqué ni restauré correctement).
 */
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => storage);
});

// Restaure les espions avant le nettoyage commun (src/test/setup.ts), qui vide
// le vrai localStorage : les hooks afterEach s'exécutent du plus récent au plus ancien.
afterEach(() => {
  vi.restoreAllMocks();
});

/** Simule un localStorage inaccessible (Safari privé, cookies bloqués…). */
function blockStorageAccess() {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}

function quotaExceeded() {
  return vi.spyOn(storage, "setItem").mockImplementation(() => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  });
}

function storageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key !== null) keys.push(key);
  }
  return keys.sort();
}

describe("safeGetItem / safeSetItem", () => {
  it("lit et écrit dans localStorage", () => {
    safeSetItem("meteoTheme", "dark");
    expect(storage.getItem("meteoTheme")).toBe("dark");
    expect(safeGetItem("meteoTheme")).toBe("dark");
  });

  it("renvoie null pour une clé absente", () => {
    expect(safeGetItem("absente")).toBeNull();
  });

  it("renvoie null sans lever d'exception si l'accès au stockage est interdit", () => {
    blockStorageAccess();
    expect(safeGetItem("meteoTheme")).toBeNull();
  });

  it("ignore l'écriture si l'accès au stockage est interdit", () => {
    blockStorageAccess();
    expect(() => safeSetItem("meteoTheme", "dark")).not.toThrow();
  });

  it("ignore l'écriture si le quota est dépassé", () => {
    const setItem = quotaExceeded();
    expect(() => safeSetItem("meteoTheme", "dark")).not.toThrow();
    expect(setItem).toHaveBeenCalledWith("meteoTheme", "dark");
    expect(storage.getItem("meteoTheme")).toBeNull();
  });

  it("renvoie null si getItem lève une exception", () => {
    const getItem = vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("indisponible");
    });
    expect(safeGetItem("meteoTheme")).toBeNull();
    expect(getItem).toHaveBeenCalledOnce();
  });

  it("fonctionne avec le localStorage réel de l'environnement", () => {
    vi.restoreAllMocks();
    safeSetItem("meteoTheme", "light");
    expect(window.localStorage.getItem("meteoTheme")).toBe("light");
    expect(safeGetItem("meteoTheme")).toBe("light");
  });
});

describe("purgeLegacyStorage", () => {
  function seed() {
    for (const key of LEGACY_KEYS) storage.setItem(key, "ancien");
    storage.setItem("user_alice", "motdepasse");
    storage.setItem("fullname_alice", "Alice");
    // Clés à conserver : préférences actuelles et clés proches mais distinctes.
    storage.setItem("meteoTheme", "dark");
    storage.setItem("auth_token", "autre-projet");
    storage.setItem("newsletter", "autre-projet");
    storage.setItem("username", "autre-projet");
    storage.setItem("my_user_alice", "autre-projet");
    storage.setItem("User_alice", "autre-projet");
  }

  it("supprime exactement les clés héritées et les préfixes user_ / fullname_", () => {
    seed();
    const removeItem = vi.spyOn(storage, "removeItem");
    purgeLegacyStorage();

    expect(storageKeys()).toEqual(
      [
        "meteoTheme",
        "auth_token",
        "newsletter",
        "username",
        "my_user_alice",
        "User_alice",
        PURGE_FLAG,
      ].sort(),
    );
    expect(storage.getItem("meteoTheme")).toBe("dark");
    const removed = removeItem.mock.calls.map(([key]) => key);
    expect(new Set(removed)).toEqual(new Set([...LEGACY_KEYS, "fullname_alice", "user_alice"]));
  });

  it("pose le marqueur après la première purge", () => {
    purgeLegacyStorage();
    expect(storage.getItem(PURGE_FLAG)).toBe("1");
  });

  it("supprime toutes les clés à préfixe sans en sauter", () => {
    for (let i = 0; i < 20; i += 1) {
      storage.setItem(`user_${i}`, "x");
      storage.setItem(`fullname_${i}`, "x");
    }
    purgeLegacyStorage();
    expect(storageKeys()).toEqual([PURGE_FLAG]);
  });

  it("n'exécute la purge par préfixe qu'une seule fois", () => {
    purgeLegacyStorage();
    storage.setItem("user_bob", "créée ensuite par un autre projet");
    storage.setItem("fullname_bob", "Bob");
    const keyLookup = vi.spyOn(storage, "key");

    purgeLegacyStorage();

    expect(storage.getItem("user_bob")).toBe("créée ensuite par un autre projet");
    expect(storage.getItem("fullname_bob")).toBe("Bob");
    // Le parcours des clés n'est même pas effectué.
    expect(keyLookup).not.toHaveBeenCalled();
  });

  it("respecte un marqueur déjà présent", () => {
    storage.setItem(PURGE_FLAG, "1");
    storage.setItem("user_alice", "motdepasse");
    purgeLegacyStorage();
    expect(storage.getItem("user_alice")).toBe("motdepasse");
  });

  it("supprime toujours les clés exactes héritées, même après la première purge", () => {
    purgeLegacyStorage();
    for (const key of LEGACY_KEYS) storage.setItem(key, "réapparue");
    purgeLegacyStorage();
    for (const key of LEGACY_KEYS) expect(storage.getItem(key)).toBeNull();
  });

  it("ne lève pas d'exception si l'accès au stockage est interdit", () => {
    blockStorageAccess();
    expect(() => purgeLegacyStorage()).not.toThrow();
  });

  it("purge quand même si l'écriture du marqueur échoue (quota), puis réessaie", () => {
    storage.setItem("user_alice", "motdepasse");
    quotaExceeded();
    expect(() => purgeLegacyStorage()).not.toThrow();
    expect(storage.getItem("user_alice")).toBeNull();
    expect(storage.getItem(PURGE_FLAG)).toBeNull();
  });
});
