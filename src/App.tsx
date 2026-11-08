import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiKeyBanner } from "@/components/api-key-banner";
import { CityGrid } from "@/components/city-grid";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Toaster } from "@/components/ui/sonner";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CITIES, type City, createCityId, normalizeName, owmIdOf } from "@/lib/cities";
import { CI_UTC_OFFSET_SEC } from "@/lib/date";
import { SITE } from "@/lib/site";
import { MAX_DYNAMIC_CITIES, validateCityName } from "@/lib/validation";
import {
  hasApiKey,
  invalidateWeatherCache,
  isAbortError,
  lookupCity,
  rateLimitRemainingMs,
  toUserMessage,
} from "@/lib/weather";

const HIGHLIGHT_MS = 2000;
/** Délai minimal entre deux actualisations manuelles (quota de l'API). */
const MANUAL_REFRESH_MIN_MS = 60_000;

/** Vrai si la touche est tapée dans un champ de saisie (pas de raccourci). */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

const toSeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export default function App() {
  const [dynamicCities, setDynamicCities] = useState<City[]>([]);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  /** Dernier rafraîchissement : déclencheur des requêtes et « maintenant » des cartes. */
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const reducedMotion = useReducedMotion();

  const highlightTimer = useRef<number | undefined>(undefined);
  const lastRefresh = useRef(refreshedAt);
  const searchController = useRef<AbortController | null>(null);

  const allCities = useMemo<City[]>(() => [...dynamicCities, ...CITIES], [dynamicCities]);
  const allCitiesRef = useRef(allCities);
  allCitiesRef.current = allCities;

  const filteredCity = useMemo(
    () => (filterId ? (allCities.find((c) => c.id === filterId) ?? null) : null),
    [allCities, filterId],
  );

  /* ------------------------------ Rafraîchissement ------------------------------ */

  const refresh = useCallback((manual: boolean) => {
    const now = Date.now();
    const rateLimited = rateLimitRemainingMs();
    if (rateLimited > 0) {
      if (manual) {
        toast.warning("Trop de requêtes envoyées au service météo.", {
          description: `Réessayez dans ${toSeconds(rateLimited)} s.`,
        });
      }
      return;
    }
    const sinceLast = now - lastRefresh.current;
    if (manual && sinceLast < MANUAL_REFRESH_MIN_MS) {
      toast.info("Les données sont déjà à jour.", {
        description: `Nouvelle actualisation possible dans ${toSeconds(MANUAL_REFRESH_MIN_MS - sinceLast)} s.`,
      });
      return;
    }
    invalidateWeatherCache();
    lastRefresh.current = now;
    setRefreshedAt(now);
    if (manual) toast.info("Mise à jour des données météo...");
  }, []);

  // Rafraîchissement automatique toutes les 10 minutes (suspendu onglet caché).
  useEffect(() => {
    const tick = () => {
      if (!document.hidden && Date.now() - lastRefresh.current >= SITE.refreshIntervalMs) {
        refresh(false);
      }
    };
    const interval = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  // Touche « R » (hors champ de saisie, sans modificateur) : actualiser les données.
  // Ctrl+Maj+R reste le rechargement forcé du navigateur.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== "r" || isEditableTarget(event.target)) return;
      event.preventDefault();
      refresh(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [refresh]);

  useEffect(
    () => () => {
      window.clearTimeout(highlightTimer.current);
      searchController.current?.abort();
    },
    [],
  );

  /* --------------------------------- Navigation --------------------------------- */

  const revealCity = useCallback(
    (id: string) => {
      setHighlightId(id);
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
      // Attendre le rendu avant de faire défiler.
      requestAnimationFrame(() => {
        document.getElementById(`ville-${id}`)?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "center",
        });
      });
    },
    [reducedMotion],
  );

  const selectCity = useCallback(
    (id: string) => {
      setFilterId(id);
      revealCity(id);
    },
    [revealCity],
  );

  const showAll = useCallback(() => setFilterId(null), []);

  // Référence stable (villes lues via une ref) : n'invalide pas le memo des cartes.
  const removeCity = useCallback((id: string) => {
    const cities = allCitiesRef.current;
    const index = cities.findIndex((c) => c.id === id);
    if (index === -1) return;
    const removed = cities[index];
    const next = cities[index + 1] ?? cities[index - 1];

    setDynamicCities((list) => list.filter((c) => c.id !== id));
    setFilterId((current) => (current === id ? null : current));
    toast.success(`« ${removed.name} » a été retirée.`);

    // Le bouton supprimé emportait le focus : le placer sur la carte suivante.
    requestAnimationFrame(() => {
      const target =
        (next && document.getElementById(`ville-${next.id}`)) ||
        document.getElementById("villes-titre");
      target?.focus({ preventScroll: true });
    });
  }, []);

  /* --------------------------------- Recherche ---------------------------------- */

  const searchCity = useCallback(
    async (raw: string): Promise<boolean> => {
      const validation = validateCityName(raw);
      if (!validation.ok) {
        toast.error(validation.error);
        return false;
      }
      const name = validation.value;

      const known = allCities.find((c) => normalizeName(c.name) === normalizeName(name));
      if (known) {
        selectCity(known.id);
        return false;
      }

      if (!hasApiKey) {
        toast.error("Clé API manquante : la recherche est indisponible.");
        return false;
      }

      if (dynamicCities.length >= MAX_DYNAMIC_CITIES) {
        toast.error(`Limite de ${MAX_DYNAMIC_CITIES} villes ajoutées atteinte.`, {
          description: "Retirez une ville ajoutée pour en rechercher une autre.",
        });
        return false;
      }

      searchController.current?.abort();
      const controller = new AbortController();
      searchController.current = controller;

      try {
        const found = await lookupCity(name, controller.signal);
        const existing = allCities.find(
          (c) => owmIdOf(c) === found.id || normalizeName(c.name) === normalizeName(found.name),
        );
        if (existing) {
          selectCity(existing.id);
          return true;
        }

        const city: City = {
          id: createCityId(),
          name: found.name,
          region: found.country === "CI" ? "Côte d'Ivoire" : "International",
          query: { id: found.id },
          dynamic: true,
          country: found.country,
          utcOffsetSec: found.utcOffsetSec ?? CI_UTC_OFFSET_SEC,
        };
        setDynamicCities((cities) =>
          cities.length >= MAX_DYNAMIC_CITIES ? cities : [city, ...cities],
        );
        setFilterId(null);
        revealCity(city.id);
        toast.success(`« ${city.name} » a été ajoutée.`);
        return true;
      } catch (error) {
        if (isAbortError(error)) return false;
        toast.error(`« ${name} » : ${toUserMessage(error)}`);
        return false;
      }
    },
    [allCities, dynamicCities.length, revealCity, selectCity],
  );

  const onManualRefresh = useCallback(() => refresh(true), [refresh]);

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#villes"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller aux prévisions
      </a>

      <Header
        cities={allCities}
        onRefresh={onManualRefresh}
        onSelectCity={selectCity}
        onSearch={searchCity}
        onClearSearch={showAll}
      />

      <main className="flex-1">
        <Hero cityCount={CITIES.length} />
        {!hasApiKey && <ApiKeyBanner />}
        <CityGrid
          cities={allCities}
          filteredCity={filteredCity}
          refreshedAt={refreshedAt}
          highlightId={highlightId}
          onShowAll={showAll}
          onRemove={removeCity}
        />
      </main>

      <Footer />
      <Toaster />
    </div>
  );
}
