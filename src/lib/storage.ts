/**
 * Accès à localStorage tolérant aux erreurs (navigation privée, stockage
 * bloqué, quotas...).
 */
export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : on ignore */
  }
}

const LEGACY_PREFIXES = ["user_", "fullname_", "auth_", "newsletter_"] as const;
const LEGACY_KEYS = ["meteoUser"] as const;

/**
 * Supprime les données héritées de l'ancienne version (comptes utilisateurs,
 * mots de passe, sessions et e-mails de newsletter stockés en clair).
 */
export function purgeLegacyStorage(): void {
  try {
    const storage = window.localStorage;
    const toRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (
        (LEGACY_KEYS as readonly string[]).includes(key) ||
        LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) storage.removeItem(key);
  } catch {
    /* stockage indisponible : rien à purger */
  }
}
