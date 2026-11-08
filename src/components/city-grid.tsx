import { LayoutGrid, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { CityCard } from "@/components/city-card";
import type { City } from "@/lib/cities";

interface CityGridProps {
  /** Toutes les villes (les cartes filtrées restent montées pour garder leur état). */
  cities: ReadonlyArray<City>;
  filteredCity: City | null;
  refreshedAt: number;
  highlightId: string | null;
  onShowAll: () => void;
  onRemove: (id: string) => void;
  /** Contenu affiché au-dessus de la grille (bandeau clé API manquante). */
  notice?: ReactNode;
}

export function CityGrid({
  cities,
  filteredCity,
  refreshedAt,
  highlightId,
  onShowAll,
  onRemove,
  notice,
}: CityGridProps) {
  // Délai d'apparition : position parmi les villes prédéfinies uniquement, pour
  // que l'ajout d'une ville en tête ne change pas les props (memo) des autres.
  let presetIndex = 0;

  return (
    <section id="villes" aria-labelledby="villes-titre" className="cities">
      {/* Titre pour les lecteurs d'écran (l'original n'avait pas de titre visible). */}
      <h2 id="villes-titre" tabIndex={-1} className="sr-only">
        Prévisions des villes de Côte d'Ivoire
      </h2>
      <p className="sr-only" aria-live="polite">
        {filteredCity ? `1 ville affichée sur ${cities.length}` : `${cities.length} villes`}
      </p>

      {notice}

      {filteredCity && (
        <div className="cities__filter">
          <p className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-4 text-[var(--mci-primary)]" />
            Affichage de <span className="font-semibold">{filteredCity.name}</span>
          </p>
          <button type="button" className="city-card__link mt-0" onClick={onShowAll}>
            <LayoutGrid aria-hidden="true" />
            Afficher toutes les villes
          </button>
        </div>
      )}

      <div className="cities-grid">
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
