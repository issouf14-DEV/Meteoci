import { CloudSun, Moon, RefreshCw, Search, Sun, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { SearchBar } from "@/components/search-bar";
import { useTheme } from "@/components/theme-provider";
import { useWeatherActivity } from "@/hooks/use-weather-activity";
import type { City } from "@/lib/cities";
import { cn } from "@/lib/utils";

interface HeaderProps {
  cities: ReadonlyArray<City>;
  onRefresh: () => void;
  onSelectCity: (id: string) => void;
  onSearch: (name: string) => Promise<boolean>;
  onClearSearch: () => void;
}

/**
 * En-tête de l'original : logo à gauche, recherche centrée, boutons ronds à
 * droite, sur le dégradé bleu. Sur mobile, la recherche s'ouvre avec un bouton
 * (l'original la masquait complètement). L'en-tête est « sticky » : il occupe
 * sa place dans la page, rien ne passe dessous.
 */
export function Header({ cities, onRefresh, onSelectCity, onSearch, onClearSearch }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  // Indicateur réel : tourne tant que des requêtes météo sont en cours ou en attente.
  const refreshing = useWeatherActivity() > 0;
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();

  // À l'ouverture sur mobile, placer le curseur dans le champ de recherche.
  useEffect(() => {
    if (!searchOpen) return;
    document.querySelector<HTMLInputElement>(`[id="${searchId}"] input`)?.focus();
  }, [searchOpen, searchId]);

  return (
    <header className="header">
      <a href="#accueil" className="header__logo" aria-label="Météo CI, retour en haut de page">
        <strong className="header__logo-text">Météo CI</strong>
        <CloudSun aria-hidden="true" className="header__logo-icon" />
      </a>

      <div id={searchId} className={cn("header__search", searchOpen && "header__search--open")}>
        <SearchBar
          cities={cities}
          onSelectCity={onSelectCity}
          onSearch={onSearch}
          onClear={onClearSearch}
        />
      </div>

      <div className="header__actions">
        <button
          type="button"
          className="header__action-btn header__action-btn--search"
          aria-label={searchOpen ? "Fermer la recherche" : "Rechercher une ville"}
          aria-expanded={searchOpen}
          aria-controls={searchId}
          onClick={() => setSearchOpen((open) => !open)}
        >
          {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="header__action-btn"
          aria-label="Actualiser les données météo (touche R)"
          aria-keyshortcuts="R"
          title="Actualiser (R)"
          onClick={onRefresh}
        >
          <RefreshCw className={cn(refreshing && "weather-icon-spin")} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="header__action-btn header__action-btn--theme"
          aria-label="Thème sombre"
          aria-pressed={isDark}
          title={isDark ? "Thème sombre activé" : "Thème sombre désactivé"}
          onClick={toggleTheme}
        >
          {isDark ? (
            <Sun aria-hidden="true" className="text-amber-400" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
