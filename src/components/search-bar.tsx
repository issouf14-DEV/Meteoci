import { Globe, Loader2, MapPin, Search, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type City, normalizeName } from "@/lib/cities";
import { cn } from "@/lib/utils";
import { CITY_NAME_MAX_LENGTH } from "@/lib/validation";

type Option = { kind: "city"; city: City } | { kind: "search"; label: string };

interface SearchBarProps {
  cities: ReadonlyArray<City>;
  onSelectCity: (id: string) => void;
  /** Recherche en ligne ; résout `true` si la saisie doit être effacée. */
  onSearch: (name: string) => Promise<boolean>;
  onClear: () => void;
  className?: string;
}

const MAX_SUGGESTIONS = 7;

export function SearchBar({ cities, onSelectCity, onSearch, onClear, className }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const options = useMemo<Option[]>(() => {
    const needle = normalizeName(value);
    if (!needle) return [];
    const matches = cities
      .filter((city) => normalizeName(city.name).includes(needle))
      .sort((a, b) => {
        const aStarts = normalizeName(a.name).startsWith(needle) ? 0 : 1;
        const bStarts = normalizeName(b.name).startsWith(needle) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name, "fr");
      })
      .slice(0, MAX_SUGGESTIONS);
    const result: Option[] = matches.map((city) => ({ kind: "city", city }));
    const exact = matches.some((city) => normalizeName(city.name) === needle);
    if (!exact && value.trim().length >= 2) {
      result.push({ kind: "search", label: value.trim().slice(0, CITY_NAME_MAX_LENGTH) });
    }
    return result;
  }, [cities, value]);

  const expanded = open && options.length > 0;

  // Ctrl/Cmd + K : focus sur la recherche.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const runSearch = async (raw: string) => {
    if (busy) return;
    close();
    setBusy(true);
    try {
      const shouldClear = await onSearch(raw);
      if (shouldClear) setValue("");
    } finally {
      setBusy(false);
    }
  };

  const choose = (option: Option) => {
    if (option.kind === "city") {
      setValue(option.city.name);
      close();
      onSelectCity(option.city.id);
    } else {
      void runSearch(option.label);
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      close();
      onClear();
      return;
    }
    const exact = cities.find((city) => normalizeName(city.name) === normalizeName(trimmed));
    if (exact) {
      choose({ kind: "city", city: exact });
    } else {
      void runSearch(trimmed);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!options.length) return;
        setOpen(true);
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!options.length) return;
        setOpen(true);
        setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
        break;
      case "Enter":
        event.preventDefault();
        if (expanded && activeIndex >= 0 && options[activeIndex]) {
          choose(options[activeIndex]);
        } else {
          submit();
        }
        break;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          close();
        } else if (value) {
          event.preventDefault();
          setValue("");
          onClear();
        }
        break;
      default:
        break;
    }
  };

  const liveMessage = expanded
    ? `${options.filter((o) => o.kind === "city").length} suggestion(s) disponible(s). Utilisez les flèches pour naviguer.`
    : "";

  return (
    <search className={cn("relative block w-full", className)}>
      <form
        aria-label="Rechercher une ville"
        className="relative w-full"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          Rechercher une ville
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={CITY_NAME_MAX_LENGTH}
          placeholder="Rechercher une ville..."
          value={value}
          readOnly={busy}
          aria-busy={busy}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            setOpen(true);
            setActiveIndex(-1);
            if (!next.trim()) onClear();
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
          className="h-11 rounded-full border-border/80 bg-card/70 pl-10 pr-24 shadow-xs"
        />

        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value && !busy ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              aria-label="Effacer la recherche"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setValue("");
                onClear();
                inputRef.current?.focus();
              }}
            >
              <X />
            </Button>
          ) : (
            <kbd className="pointer-events-none mr-1 hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground md:inline-flex">
              Ctrl K
            </kbd>
          )}
          <Button
            type="submit"
            size="icon-sm"
            className="rounded-full"
            aria-label="Lancer la recherche"
            disabled={busy}
          >
            {busy ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>

        {expanded && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Suggestions de villes"
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto overscroll-contain rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 animation-duration-150"
          >
            {options.map((option, index) => {
              const active = index === activeIndex;
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: motif combobox ARIA (aria-activedescendant) : le clavier est géré par le champ de saisie (flèches, Entrée, Échap), le focus ne quitte jamais l'input.
                <div
                  key={option.kind === "city" ? option.city.id : "__search__"}
                  id={optionId(index)}
                  role="option"
                  tabIndex={-1}
                  aria-selected={active}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                    active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  {option.kind === "city" ? (
                    <>
                      <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
                      <span className="truncate font-medium">{option.city.name}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {option.city.region}
                      </span>
                    </>
                  ) : (
                    <>
                      <Globe aria-hidden="true" className="size-4 shrink-0 text-success" />
                      <span className="truncate">
                        Rechercher <span className="font-medium">« {option.label} »</span>
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {busy ? "Recherche en cours..." : liveMessage}
        </p>
      </form>
    </search>
  );
}
