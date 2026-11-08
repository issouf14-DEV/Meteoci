import { LayoutGrid, MapPin } from "lucide-react";

import { CityCard } from "@/components/city-card";
import { Button } from "@/components/ui/button";
import type { City } from "@/lib/cities";

interface CityGridProps {
  /** Toutes les villes (les cartes filtrées restent montées pour garder leur état). */
  cities: ReadonlyArray<City>;
  filteredCity: City | null;
  refreshedAt: number;
  highlightId: string | null;
  onShowAll: () => void;
  onRemove: (id: string) => void;
}

export function CityGrid({
  cities,
  filteredCity,
  refreshedAt,
  highlightId,
  onShowAll,
  onRemove,
}: CityGridProps) {
  // Délai d'apparition : position parmi les villes prédéfinies uniquement, pour
  // que l'ajout d'une ville en tête ne change pas les props (memo) des autres.
  let presetIndex = 0;

  return (
    <section
      id="villes"
      aria-labelledby="villes-titre"
      className="container scroll-mt-24 py-12 sm:py-16"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-cyan-700 dark:text-secondary">
            Prévisions
          </p>
          <h2
            id="villes-titre"
            tabIndex={-1}
            className="rounded-sm font-heading text-3xl font-bold focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:text-4xl"
          >
            Villes de Côte d'Ivoire
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Choisissez une date et une heure sur chaque carte pour consulter les prévisions jusqu'à
            5 jours. Recherchez une ville pour l'ajouter.
          </p>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
          {filteredCity ? `1 ville affichée sur ${cities.length}` : `${cities.length} villes`}
        </p>
      </div>

      {filteredCity && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs animate-in fade-in-0 slide-in-from-top-2 animation-duration-200">
          <p className="flex items-center gap-2 text-sm">
            <MapPin aria-hidden="true" className="size-4 text-primary" />
            Affichage de <span className="font-semibold">{filteredCity.name}</span>
          </p>
          <Button variant="soft" size="sm" className="pointer-coarse:h-11" onClick={onShowAll}>
            <LayoutGrid aria-hidden="true" />
            Afficher toutes les villes
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cities.map((city) => (
          <CityCard
            key={city.id}
            city={city}
            animationIndex={city.dynamic ? 0 : presetIndex++}
            refreshedAt={refreshedAt}
            highlighted={highlightId === city.id}
            hidden={filteredCity !== null && filteredCity.id !== city.id}
            onRemove={city.dynamic ? onRemove : undefined}
          />
        ))}
      </div>
    </section>
  );
}
