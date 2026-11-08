import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Clock,
  Droplets,
  KeyRound,
  Loader2,
  MapPin,
  RotateCcw,
  RotateCw,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from "lucide-react";
import { type CSSProperties, memo, useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWeather } from "@/hooks/use-weather";
import type { City } from "@/lib/cities";
import {
  addDays,
  combineLocal,
  formatDateTime,
  formatTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import type { WeatherSnapshot } from "@/lib/weather";
import { getWeatherVisual } from "@/lib/weather-icons";

interface CityCardProps {
  city: City;
  index: number;
  refreshKey: number;
  highlighted: boolean;
  hidden?: boolean;
  onRemove?: (id: string) => void;
}

interface Selection {
  date: string;
  time: string;
}

const round = (n: number) => Math.round(n);
const capitalize = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1) : s);

function CityCardImpl({
  city,
  index,
  refreshKey,
  highlighted,
  hidden = false,
  onRemove,
}: CityCardProps) {
  const uid = useId();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Recalculé à chaque rafraîchissement pour garder "maintenant" à jour.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `refreshKey` sert uniquement de déclencheur pour recalculer la date courante.
  const now = useMemo(() => new Date(), [refreshKey]);
  const today = toDateInputValue(now);
  const maxDate = toDateInputValue(addDays(now, 5));
  const dateValue = selection?.date ?? today;
  const timeValue = selection?.time ?? toTimeInputValue(now);

  const target = useMemo(
    () => (selection ? combineLocal(selection.date, selection.time) : null),
    [selection],
  );

  const weather = useWeather(city.query, target, refreshKey);
  const visual = weather.data
    ? getWeatherVisual(weather.data.conditionId, weather.data.main, weather.data.icon)
    : null;

  const updateSelection = (patch: Partial<Selection>) => {
    const next = { date: dateValue, time: timeValue, ...patch };
    if (!next.date) {
      setSelection(null);
      return;
    }
    setSelection(next);
  };

  const handleRemove = () => {
    if (!onRemove) return;
    setLeaving(true);
    window.setTimeout(() => onRemove(city.id), 200);
  };

  const style: CSSProperties = leaving ? {} : { animationDelay: `${Math.min(index, 12) * 45}ms` };

  return (
    <Card
      id={`ville-${city.id}`}
      aria-labelledby={`${uid}-title`}
      aria-busy={weather.status === "loading"}
      style={style}
      className={cn(
        "group relative flex scroll-mt-28 flex-col overflow-hidden border-border/70 transition-transform duration-300 ease-out hover:-translate-y-1",
        "animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-backwards animation-duration-500",
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
          "h-1 w-full bg-linear-to-r/srgb transition-opacity duration-500",
          visual ? visual.bar : "from-muted to-muted",
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
              {city.dynamic && city.country && city.country !== "CI" && (
                <Badge variant="muted">{city.country}</Badge>
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

        <fieldset className="grid grid-cols-[1fr_auto] gap-2">
          <legend className="sr-only">Date et heure de la prévision pour {city.name}</legend>
          <label htmlFor={`${uid}-date`} className="sr-only">
            Date pour {city.name}
          </label>
          <Input
            id={`${uid}-date`}
            type="date"
            value={dateValue}
            min={today}
            max={maxDate}
            onChange={(event) => updateSelection({ date: event.target.value })}
            className="h-9 bg-muted/50 px-2.5 [color-scheme:light] dark:[color-scheme:dark]"
          />
          <label htmlFor={`${uid}-time`} className="sr-only">
            Heure pour {city.name}
          </label>
          <Input
            id={`${uid}-time`}
            type="time"
            value={timeValue}
            onChange={(event) => updateSelection({ time: event.target.value })}
            className="h-9 w-[6.5rem] bg-muted/50 px-2.5 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </fieldset>

        <div className="flex flex-1 flex-col">
          {weather.status === "error" ? (
            <ErrorState
              message={weather.error}
              noKey={weather.code === "NO_KEY"}
              onRetry={weather.retry}
            />
          ) : weather.data && visual ? (
            <WeatherBody data={weather.data} visual={visual} />
          ) : (
            <LoadingState />
          )}
        </div>

        <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            {weather.data?.isForecast ? (
              <>
                <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  Prévision · {formatDateTime(new Date(weather.data.timestamp))}
                </span>
              </>
            ) : weather.data ? (
              <>
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  Actuellement · mis à jour à {formatTime(new Date(weather.data.fetchedAt))}
                </span>
              </>
            ) : null}
          </span>
          {selection && (
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2 h-8 shrink-0 px-2 text-xs"
              onClick={() => setSelection(null)}
            >
              <RotateCcw aria-hidden="true" />
              Maintenant
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function WeatherBody({
  data,
  visual,
}: {
  data: WeatherSnapshot;
  visual: ReturnType<typeof getWeatherVisual>;
}) {
  const { Icon } = visual;
  return (
    <div className="flex flex-1 flex-col gap-4 animate-in fade-in-0 animation-duration-300">
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

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/60 px-1.5 py-2">
      <dt className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col gap-4" role="status">
      <span className="sr-only">Chargement de la météo...</span>
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-11 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-5 w-28" />
      <Separator />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[3.25rem] rounded-lg" />
        <Skeleton className="h-[3.25rem] rounded-lg" />
        <Skeleton className="h-[3.25rem] rounded-lg" />
      </div>
    </div>
  );
}

function ErrorState({
  message,
  noKey,
  onRetry,
}: {
  message: string;
  noKey: boolean;
  onRetry: () => void;
}) {
  const Icon = noKey ? KeyRound : AlertTriangle;
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-4 py-6 text-center animate-in fade-in-0 animation-duration-300"
    >
      <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="text-sm font-medium">{message}</p>
      {!noKey && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Réessayer
        </Button>
      )}
    </div>
  );
}

export const CityCard = memo(CityCardImpl);
