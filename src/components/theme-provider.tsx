import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { type Theme, themeSchema } from "@/lib/schemas";
import { safeGetItem, safeSetItem } from "@/lib/storage";

export type { Theme };

/** Même clé que l'ancienne version, pour conserver la préférence. */
export const THEME_STORAGE_KEY = "meteoTheme";
const THEME_COLORS: Record<Theme, string> = { light: "#1e40af", dark: "#0b1121" };
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  const result = themeSchema.safeParse(safeGetItem(THEME_STORAGE_KEY));
  return result.success ? result.data : null;
}

function systemTheme(): Theme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? systemTheme());
  const [explicit, setExplicit] = useState(() => readStoredTheme() !== null);

  useLayoutEffect(() => {
    // Les transitions du site ne portent que sur `transform` : changer de thème ne
    // déclenche aucune animation de couleur, un seul recalcul de styles suffit.
    // Au premier rendu, theme-init.js a déjà posé la bonne classe : rien ne change.
    const root = document.documentElement;
    if (root.classList.contains("dark") !== (theme === "dark")) {
      root.classList.toggle("dark", theme === "dark");
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  // Persistance hors de la fonction de mise à jour d'état (pas d'effet de bord rejoué en StrictMode).
  useEffect(() => {
    if (explicit) safeSetItem(THEME_STORAGE_KEY, theme);
  }, [explicit, theme]);

  // Suit le thème du système tant que l'utilisateur n'a pas fait de choix.
  useEffect(() => {
    if (explicit || !window.matchMedia) return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setThemeState(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [explicit]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
    setExplicit(true);
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme doit être utilisé dans <ThemeProvider>.");
  return context;
}
