import { CloudSun, Moon, RefreshCw, Sun } from "lucide-react";

import { SearchBar } from "@/components/search-bar";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { City } from "@/lib/cities";
import { cn } from "@/lib/utils";

interface HeaderProps {
  cities: ReadonlyArray<City>;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectCity: (id: string) => void;
  onSearch: (name: string) => Promise<boolean>;
  onClearSearch: () => void;
}

export function Header({
  cities,
  refreshing,
  onRefresh,
  onSelectCity,
  onSearch,
  onClearSearch,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const themeLabel = isDark ? "Activer le thème clair" : "Activer le thème sombre";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
      <div className="container flex flex-wrap items-center gap-x-4 gap-y-3 py-3 md:h-16 md:flex-nowrap md:py-0">
        <a
          href="#accueil"
          className="group flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          aria-label="Météo CI, retour en haut de page"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20 transition-transform duration-300 ease-out group-hover:rotate-[-6deg] group-hover:scale-105">
            <CloudSun className="size-5" aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">
            Météo <span className="text-accent">CI</span>
          </span>
        </a>

        <div className="order-last w-full md:order-none md:mx-auto md:max-w-md md:flex-1">
          <SearchBar
            cities={cities}
            onSelectCity={onSelectCity}
            onSearch={onSearch}
            onClear={onClearSearch}
          />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Actualiser les données météo (Ctrl+Maj+R)"
                onClick={onRefresh}
              >
                <RefreshCw className={cn(refreshing && "animate-spin")} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Actualiser (Ctrl+Maj+R)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                aria-label={themeLabel}
                aria-pressed={isDark}
                onClick={toggleTheme}
              >
                <Sun
                  aria-hidden="true"
                  className="absolute rotate-0 scale-100 text-amber-500 transition-transform duration-300 ease-out dark:-rotate-90 dark:scale-0"
                />
                <Moon
                  aria-hidden="true"
                  className="absolute rotate-90 scale-0 text-blue-300 transition-transform duration-300 ease-out dark:rotate-0 dark:scale-100"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{themeLabel}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
