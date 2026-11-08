import { LayoutGrid, MapPin } from "lucide-react";

import { CityCard } from "@/components/city-card";
import { Button } from "@/components/ui/button";
import type { City } from "@/lib/cities";

interface CityGridProps {
  /** Toutes les villes (les cartes filtrées restent montées pour garder leur état). */
  cities: ReadonlyArray<City>;
  filteredCity: City | null;
  totalCount: number;
  refreshKey: number;
  highlightId: string | null;
  onShowAll: () => void;
  onRemove: (id: string) => void;
}

export function CityGrid({
  cities,
  filteredCity,
  totalCount,
  refreshKey,
  highlightId,
  onShowAll,
  onRemove,
}: CityGridProps) {
  return (
    <section id="villes" aria-labelledby="villes-titre" className="container scroll-mt-24 py-12 sm:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
            Prévisions
          </p>
          <h2 id="villes-titre" className="font-heading text-3xl font-bold sm:text-4xl">
            Villes de Côte d'Ivoire
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Choisissez une date et une heure sur chaque carte pour consulter les prévisions
            jusqu'à 5 jours. Recherchez une ville pour l'ajouter.
          </p>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
          {filteredCity ? `1 ville affichée sur ${totalCount}` : `${totalCount} villes`}
        </p>
      </div>

      {filteredCity && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm animate-in fade-in-0 slide-in-from-top-2 [animation-duration:250ms]">
          <p className="flex items-center gap-2 text-sm">
            <MapPin aria-hidden="true" className="size-4 text-primary" />
            Affichage de <span className="font-semibold">{filteredCity.name}</span>
          </p>
          <Button variant="soft" size="sm" onClick={onShowAll}>
            <LayoutGrid aria-hidden="true" />
            Afficher toutes les villes
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cities.map((city, index) => (
          <CityCard
            key={city.id}
            city={city}
            index={index}
            refreshKey={refreshKey}
            highlighted={highlightId === city.id}
            hidden={filteredCity !== null && filteredCity.id !== city.id}
            onRemove={city.dynamic ? onRemove : undefined}
          />
        ))}
      </div>
    </section>
  );
}
