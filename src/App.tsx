import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiKeyBanner } from "@/components/api-key-banner";
import { CityGrid } from "@/components/city-grid";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Toaster } from "@/components/ui/sonner";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { CITIES, createCityId, normalizeName, type City } from "@/lib/cities";
import { SITE } from "@/lib/site";
import { validateCityName } from "@/lib/validation";
import {
  clearWeatherCache,
  hasApiKey,
  isAbortError,
  lookupCity,
  toUserMessage,
} from "@/lib/weather";

const HIGHLIGHT_MS = 2000;

export default function App() {
  const [dynamicCities, setDynamicCities] = useState<City[]>([]);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reducedMotion = useReducedMotion();

  const highlightTimer = useRef<number | undefined>(undefined);
  const refreshTimer = useRef<number | undefined>(undefined);
  const lastRefresh = useRef(Date.now());
  const searchController = useRef<AbortController | null>(null);

  const allCities = useMemo<City[]>(() => [...dynamicCities, ...CITIES], [dynamicCities]);
  const filteredCity = useMemo(
    () => (filterId ? allCities.find((c) => c.id === filterId) ?? null : null),
    [allCities, filterId],
  );

  /* ------------------------------ Rafraîchissement ------------------------------ */

  const refresh = useCallback((manual: boolean) => {
    clearWeatherCache();
    lastRefresh.current = Date.now();
    setRefreshKey((k) => k + 1);
    setRefreshing(true);
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => setRefreshing(false), 1200);
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

  // Ctrl/Cmd + Maj + R : actualiser les données.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        refresh(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [refresh]);

  useEffect(
    () => () => {
      window.clearTimeout(highlightTimer.current);
      window.clearTimeout(refreshTimer.current);
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

  const removeCity = useCallback((id: string) => {
    setDynamicCities((cities) => cities.filter((c) => c.id !== id));
    setFilterId((current) => (current === id ? null : current));
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

      searchController.current?.abort();
      const controller = new AbortController();
      searchController.current = controller;

      try {
        const found = await lookupCity(name, controller.signal);
        const existing = allCities.find(
          (c) => c.owmId === found.id || normalizeName(c.name) === normalizeName(found.name),
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
          owmId: found.id,
          country: found.country,
        };
        setDynamicCities((cities) => [city, ...cities]);
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
    [allCities, revealCity, selectCity],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#villes"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller aux prévisions
      </a>

      <Header
        cities={allCities}
        refreshing={refreshing}
        onRefresh={() => refresh(true)}
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
          totalCount={allCities.length}
          refreshKey={refreshKey}
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
