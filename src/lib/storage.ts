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

/**
 * Clés exactes écrites par l'ancienne version (auth + newsletter supprimées).
 * Les préfixes larges `auth_` / `newsletter_` ne sont plus utilisés : l'origine
 * `issouf14-dev.github.io` est partagée par tous les dépôts GitHub Pages du
 * compte, et un préfixe générique risquerait d'effacer les données d'un autre
 * projet servi depuis la même origine.
 */
const LEGACY_KEYS = [
  "auth_attempts",
  "auth_session",
  "newsletter_subs",
  "newsletter_rate",
  "meteoUser",
] as const;

/**
 * Préfixes conservés : c'est le motif exact de l'ancienne version
 * (`CONFIG.STORAGE_KEYS.USER_PREFIX` / `FULLNAME_PREFIX` suivis du nom
 * d'utilisateur). Le suffixe étant libre, il n'existe pas de clé exacte. Ces
 * entrées contenaient des mots de passe (en clair puis hachés) : on accepte le
 * risque résiduel de collision sur l'origine partagée, mais la purge par
 * préfixe n'est exécutée qu'une seule fois (marqueur `LEGACY_PURGE_FLAG`) pour
 * ne pas effacer de manière répétée des clés créées ensuite par un autre projet.
 */
const LEGACY_PREFIXES = ["user_", "fullname_"] as const;
const LEGACY_PURGE_FLAG = "meteoLegacyPurgeV1";

/**
 * Supprime les données héritées de l'ancienne version (comptes utilisateurs,
 * mots de passe, sessions et e-mails de newsletter stockés en clair).
 */
export function purgeLegacyStorage(): void {
  try {
    const storage = window.localStorage;
    for (const key of LEGACY_KEYS) storage.removeItem(key);

    if (storage.getItem(LEGACY_PURGE_FLAG) === "1") return;
    const toRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) storage.removeItem(key);
    storage.setItem(LEGACY_PURGE_FLAG, "1");
  } catch {
    /* stockage indisponible : rien à purger */
  }
}
