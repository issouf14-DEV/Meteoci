import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Clock,
  CloudOff,
  Droplets,
  Info,
  KeyRound,
  Loader2,
  type LucideIcon,
  MapPin,
  RotateCcw,
  RotateCw,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from "lucide-react";
import { type CSSProperties, memo, useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWeather } from "@/hooks/use-weather";
import type { City } from "@/lib/cities";
import {
  combineLocal,
  formatDateTime,
  formatTime,
  formatUtcOffset,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  CURRENT_TOLERANCE_MS,
  FORECAST_HORIZON_MS,
  hasApiKey,
  RETRYABLE_CODES,
  type WeatherErrorCode,
  type WeatherSnapshot,
} from "@/lib/weather";
import { getWeatherVisual, type WeatherVisual } from "@/lib/weather-icons";

interface CityCardProps {
  city: City;
  /** Rang d'apparition (délai d'animation), stable quand on ajoute une ville. */
  animationIndex: number;
  /** Dernier rafraîchissement global (ms) : sert aussi de « maintenant ». */
  refreshedAt: number;
  highlighted: boolean;
  hidden?: boolean;
  onRemove?: (id: string) => void;
}

interface Selection {
  date: string;
  time: string;
}

const LEAVE_MS = 200;

const round = (n: number) => Math.round(n);
const capitalize = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1) : s);

/**
 * Ramène la date choisie dans la plage disponible au lieu de produire une
 * erreur : heure passée → conditions actuelles ; au-delà de l'horizon des
 * prévisions → dernière prévision disponible.
 */
function resolveTarget(
  picked: number | null,
  now: number,
  offsetSec: number,
): { targetMs: number | null; notice: string | null } {
  if (picked === null) return { targetMs: null, notice: null };
  if (picked < now - CURRENT_TOLERANCE_MS) {
    return { targetMs: null, notice: "Heure passée : conditions actuelles affichées." };
  }
  if (picked <= now + CURRENT_TOLERANCE_MS) return { targetMs: null, notice: null };
  const horizon = now + FORECAST_HORIZON_MS;
  if (picked > horizon) {
    return {
      targetMs: horizon,
      notice: `Prévisions disponibles jusqu'au ${formatDateTime(horizon, offsetSec)}.`,
    };
  }
  return { targetMs: picked, notice: null };
}

function CityCardImpl({
  city,
  animationIndex,
  refreshedAt,
  highlighted,
  hidden = false,
  onRemove,
}: CityCardProps) {
  const uid = useId();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const offset = city.utcOffsetSec;
  const now = refreshedAt;
  const horizon = now + FORECAST_HORIZON_MS;
  const today = toDateInputValue(now, offset);
  const maxDate = toDateInputValue(horizon, offset);
  const dateValue = selection?.date ?? today;
  const timeValue = selection?.time ?? toTimeInputValue(now, offset);
  const tzLabel = formatUtcOffset(offset);
  const international = city.dynamic && city.country !== undefined && city.country !== "CI";

  const picked = selection ? combineLocal(selection.date, selection.time, offset) : null;
  const { targetMs, notice } = resolveTarget(picked, now, offset);

  const weather = useWeather(city.query, targetMs, refreshedAt, !hidden);
  const visual = weather.data
    ? getWeatherVisual(weather.data.conditionId, weather.data.main, weather.data.icon)
    : null;
  const stale = weather.status === "error" && weather.data !== null;

  const updateSelection = (patch: Partial<Selection>) => {
    const next = { date: dateValue, time: timeValue, ...patch };
    // Champ vidé : retour à « maintenant » (pas d'heure implicite).
    if (!next.date || !next.time) {
      setSelection(null);
      return;
    }
    setSelection(next);
  };

  const handleRemove = () => {
    if (!onRemove || leaving) return;
    setLeaving(true);
    leaveTimer.current = window.setTimeout(() => onRemove(city.id), LEAVE_MS);
  };

  const style: CSSProperties = leaving
    ? {}
    : { animationDelay: `${Math.min(animationIndex, 12) * 45}ms` };

  return (
    <article
      id={`ville-${city.id}`}
      data-slot="card"
      tabIndex={-1}
      aria-labelledby={`${uid}-title`}
      aria-busy={weather.status === "loading"}
      style={style}
      className={cn(
        "group relative flex scroll-mt-28 flex-col overflow-hidden rounded-lg border border-border/70 bg-card text-card-foreground shadow-xs transition-transform duration-300 ease-out hover:-translate-y-1",
        "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        "animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-backwards animation-duration-300 ease-out",
        hidden && "hidden",
        leaving &&
          "pointer-events-none animate-out fade-out-0 zoom-out-95 fill-mode-forwards [--tw-animation-delay:0ms] animation-duration-200",
      )}
    >
      {/* Ombre de survol (opacité uniquement) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 shadow-xl shadow-primary/10 transition-opacity duration-300 ease-out group-hover:opacity-100 dark:shadow-black/40"
      />
      {/* Mise en évidence après une recherche */}
      {highlighted && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-lg ring-2 ring-inset ring-accent animate-highlight"
        />
      )}
      {/* Barre d'accent selon la condition météo */}
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-full bg-linear-to-r/srgb",
          visual && !stale ? visual.bar : "from-muted to-muted",
        )}
      />

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3
              id={`${uid}-title`}
              className="truncate font-heading text-lg font-semibold leading-tight"
            >
              {city.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant={city.dynamic ? "accent" : "secondary"}>
                <MapPin aria-hidden="true" />
                {city.region}
              </Badge>
              {international && (
                <Badge variant="muted">
                  {city.country} · {tzLabel}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {weather.status === "loading" && weather.data && (
              <Loader2
                aria-label="Actualisation"
                className="size-4 animate-spin text-muted-foreground"
              />
            )}
            {onRemove && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    aria-label={`Retirer ${city.name}`}
                    disabled={leaving}
                    onClick={handleRemove}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retirer cette ville</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <fieldset className="grid grid-cols-[1fr_auto] gap-2" disabled={!hasApiKey}>
          <legend className="sr-only">
            Date et heure de la prévision pour {city.name} (heure locale, {tzLabel})
          </legend>
          <label htmlFor={`${uid}-date`} className="sr-only">
            Date pour {city.name}
          </label>
          <Input
            id={`${uid}-date`}
            type="date"
            value={dateValue}
            min={today}
            max={maxDate}
            title={`Date locale (${tzLabel})`}
            onChange={(event) => updateSelection({ date: event.target.value })}
            className="h-11 bg-muted/50 px-2.5 [color-scheme:light] pointer-fine:h-9 dark:[color-scheme:dark]"
          />
          <label htmlFor={`${uid}-time`} className="sr-only">
            Heure pour {city.name} (heure locale, {tzLabel})
          </label>
          <Input
            id={`${uid}-time`}
            type="time"
            value={timeValue}
            min={dateValue === today ? toTimeInputValue(now, offset) : undefined}
            max={dateValue === maxDate ? toTimeInputValue(horizon, offset) : undefined}
            title={`Heure locale (${tzLabel})`}
            onChange={(event) => updateSelection({ time: event.target.value })}
            className="h-11 w-[6.5rem] bg-muted/50 px-2.5 [color-scheme:light] pointer-fine:h-9 dark:[color-scheme:dark]"
          />
          {notice && (
            <p className="col-span-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
              {notice}
            </p>
          )}
        </fieldset>

        <div className="flex flex-1 flex-col">
          {!hasApiKey ? (
            <NoKeyState />
          ) : weather.data && visual ? (
            <WeatherBody data={weather.data} visual={visual} stale={stale} />
          ) : weather.status === "error" ? (
            <ErrorState
              message={weather.error ?? "Une erreur inattendue est survenue."}
              code={weather.code}
              onRetry={weather.retry}
              onReset={() => setSelection(null)}
            />
          ) : (
            <LoadingState />
          )}
        </div>

        <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            {stale && weather.data ? (
              <>
                <CloudOff aria-hidden="true" className="size-3.5 shrink-0 text-amber-600" />
                <span className="truncate">
                  Données de {formatTime(weather.data.fetchedAt, offset)} · mise à jour impossible
                </span>
              </>
            ) : weather.data?.isForecast ? (
              <>
                <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  Prévision · {formatDateTime(weather.data.timestamp, offset)}
                </span>
              </>
            ) : weather.data ? (
              <>
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  Actuellement · mis à jour à {formatTime(weather.data.fetchedAt, offset)}
                </span>
              </>
            ) : null}
          </span>
          <span className="flex shrink-0 items-center">
            {stale && weather.code !== null && RETRYABLE_CODES.has(weather.code) && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                aria-label={`Réessayer la mise à jour de ${city.name}`}
                title="Réessayer"
                onClick={weather.retry}
              >
                <RotateCw aria-hidden="true" />
              </Button>
            )}
            {selection && (
              <Button
                variant="ghost"
                size="sm"
                className="-mr-2 h-8 px-2 text-xs pointer-coarse:h-11"
                onClick={() => setSelection(null)}
              >
                <RotateCcw aria-hidden="true" />
                Maintenant
              </Button>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

function WeatherBody({
  data,
  visual,
  stale,
}: {
  data: WeatherSnapshot;
  visual: WeatherVisual;
  stale: boolean;
}) {
  const { Icon } = visual;
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-4 transition-opacity duration-200 ease-out animate-in fade-in-0 animation-duration-200",
        stale && "opacity-75",
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("grid size-16 shrink-0 place-items-center rounded-2xl", visual.bg)}>
          <Icon
            aria-hidden="true"
            strokeWidth={1.75}
            className={cn(
              "size-9",
              visual.color,
              visual.motion === "spin" && "animate-spin-slow",
              visual.motion === "float" && "animate-float",
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-5xl font-semibold leading-none tabular-nums tracking-tight">
            {round(data.temp)}
            <span className="align-top text-2xl font-medium text-muted-foreground">°C</span>
          </p>
          <p className="mt-1.5 truncate text-sm font-medium text-muted-foreground">
            {capitalize(data.description)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm tabular-nums">
        <span className="flex items-center gap-1">
          <ArrowUp aria-hidden="true" className="size-4 text-orange-500" />
          <span className="sr-only">Maximum</span>
          <span className="font-semibold">{round(data.tempMax)}°</span>
        </span>
        <span className="flex items-center gap-1">
          <ArrowDown aria-hidden="true" className="size-4 text-sky-500" />
          <span className="sr-only">Minimum</span>
          <span className="font-semibold">{round(data.tempMin)}°</span>
        </span>
        {data.pop !== null && (
          <span className="ml-auto flex items-center gap-1 text-muted-foreground">
            <Umbrella aria-hidden="true" className="size-4" />
            <span className="sr-only">Probabilité de pluie</span>
            {Math.round(data.pop * 100)}%
          </span>
        )}
      </div>

      <Separator />

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Detail icon={Thermometer} label="Ressenti" value={`${round(data.feelsLike)}°`} />
        <Detail icon={Droplets} label="Humidité" value={`${round(data.humidity)}%`} />
        <Detail
          icon={Wind}
          label="Vent"
          value={data.windKmh === null ? "—" : `${data.windKmh} km/h`}
        />
      </dl>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-1.5 py-2">
      <dt className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Squelette aux dimensions exactes du contenu final (pas de décalage de mise en page). */
function LoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4" role="status">
      <span className="sr-only">Chargement de la météo...</span>
      {/* Icône 64 px + bloc température 48 + 6 + 20 = 74 px */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="mt-1.5 h-5 w-32" />
        </div>
      </div>
      <Skeleton className="h-5 w-28" />
      <Separator />
      {/* Tuiles : 8 + 16 + 2 + 20 + 8 = 54 px */}
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[3.375rem] rounded-lg" />
        <Skeleton className="h-[3.375rem] rounded-lg" />
        <Skeleton className="h-[3.375rem] rounded-lg" />
      </div>
    </div>
  );
}

/** État neutre sans clé API (la bannière en haut de page explique déjà le problème). */
function NoKeyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground">
      <span className="grid size-11 place-items-center rounded-full bg-muted">
        <KeyRound aria-hidden="true" className="size-5" />
      </span>
      <p className="text-sm">Données indisponibles</p>
    </div>
  );
}

function ErrorState({
  message,
  code,
  onRetry,
  onReset,
}: {
  message: string;
  code: WeatherErrorCode | null;
  onRetry: () => void;
  onReset: () => void;
}) {
  const outOfRange = code === "PAST_DATE" || code === "OUT_OF_RANGE";
  const retryable = code === null || RETRYABLE_CODES.has(code);
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-6 text-center animate-in fade-in-0 animation-duration-200"
    >
      <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <p className="text-sm font-medium">{message}</p>
      {outOfRange ? (
        <Button variant="outline" size="sm" className="pointer-coarse:h-11" onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          Revenir à maintenant
        </Button>
      ) : retryable ? (
        <Button variant="outline" size="sm" className="pointer-coarse:h-11" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}

export const CityCard = memo(CityCardImpl);
