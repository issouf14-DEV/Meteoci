import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { safeGetItem, safeSetItem } from "@/lib/storage";

export type Theme = "light" | "dark";

/** Même clé que l'ancienne version, pour conserver la préférence. */
export const THEME_STORAGE_KEY = "meteoTheme";
const THEME_COLORS: Record<Theme, string> = { light: "#1e40af", dark: "#0b1121" };
const DARK_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  const value = safeGetItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

function systemTheme(): Theme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? systemTheme());
  const [explicit, setExplicit] = useState(() => readStoredTheme() !== null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  // Suit le thème du système tant que l'utilisateur n'a pas fait de choix.
  useEffect(() => {
    if (explicit || !window.matchMedia) return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setThemeState(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [explicit]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setExplicit(true);
    safeSetItem(THEME_STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      safeSetItem(THEME_STORAGE_KEY, next);
      return next;
    });
    setExplicit(true);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme doit être utilisé dans <ThemeProvider>.");
  return context;
}
