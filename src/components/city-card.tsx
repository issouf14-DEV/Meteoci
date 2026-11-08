import {
  AlertTriangle,
  CalendarClock,
  CloudOff,
  Droplets,
  KeyRound,
  Loader2,
  RotateCcw,
  RotateCw,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { DateTimePicker } from "@/components/date-time-picker";
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
import { getWeatherVisual, MOTION_CLASS } from "@/lib/weather-icons";

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

/**
 * Carte ville au design de la version d'origine (`city-card`) : nom, date,
 * heure, pastille ronde à la couleur de la météo, température max (rouge),
 * min (bleu) et condition. Quelques informations en petit en dessous.
 */
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
  // Animation d'entrée jouée une seule fois : sinon, « Afficher toutes les villes »
  // (display: none → visible) la rejouerait sur chaque carte.
  const [entered, setEntered] = useState(false);
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
  const data = weather.data;
  const stale = weather.status === "error" && data !== null;
  const refreshing = weather.status === "loading" && data !== null;

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

  // Apparition en cascade courte (25 ms par carte, 200 ms au total au plus).
  const style: CSSProperties | undefined =
    leaving || entered ? undefined : { animationDelay: `${Math.min(animationIndex, 8) * 25}ms` };

  return (
    <article
      id={`ville-${city.id}`}
      tabIndex={-1}
      aria-labelledby={`${uid}-title`}
      aria-busy={weather.status === "loading"}
      style={style}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName === "mci-fade-in-up") {
          setEntered(true);
        }
      }}
      className={cn(
        "city-card",
        !entered && "city-card--enter",
        highlighted && !leaving && "city-card--highlight",
        leaving && "city-card--leaving",
        hidden && "hidden",
      )}
    >
      {refreshing && (
        <span className="city-card__corner city-card__corner--left">
          <Loader2 aria-label="Actualisation" className="weather-icon-spin" />
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          className="city-card__corner city-card__corner--right"
          aria-label={`Retirer ${city.name}`}
          title="Retirer cette ville"
          disabled={leaving}
          onClick={handleRemove}
        >
          <X aria-hidden="true" />
        </button>
      )}

      <h3 id={`${uid}-title`} className="city-card__name" title={city.name}>
        {city.name}
      </h3>
      {international && (
        <p className="city-card__country">
          {city.country} · heure locale {tzLabel}
        </p>
      )}

      <fieldset className="city-card__inputs" disabled={!hasApiKey}>
        <legend className="sr-only">
          Date et heure de la prévision pour {city.name} (heure locale, {tzLabel})
        </legend>
        <DateTimePicker
          className="mb-2 flex-col gap-1.5"
          idPrefix={uid}
          cityName={city.name}
          tzLabel={tzLabel}
          date={dateValue}
          time={timeValue}
          minDate={today}
          maxDate={maxDate}
          minTime={toTimeInputValue(now, offset)}
          maxTime={toTimeInputValue(horizon, offset)}
          onDateChange={(date) => updateSelection({ date })}
          onTimeChange={(time) => updateSelection({ time })}
          onReset={() => setSelection(null)}
          disabled={!hasApiKey}
        />
        {notice && <p className="city-card__note">{notice}</p>}
      </fieldset>

      {!hasApiKey ? (
        <PlaceholderBody tone="idle" icon={<KeyRound className="city-card__icon" />}>
          <p className="city-card__condition">Données indisponibles</p>
        </PlaceholderBody>
      ) : data ? (
        <WeatherBody data={data} stale={stale} />
      ) : weather.status === "error" ? (
        <ErrorBody
          message={weather.error ?? "Une erreur inattendue est survenue."}
          code={weather.code}
          onRetry={weather.retry}
          onReset={() => setSelection(null)}
        />
      ) : (
        <div role="status" className="w-full">
          <span className="sr-only">Chargement de la météo...</span>
          <PlaceholderBody
            tone="loading"
            icon={<Loader2 className="city-card__icon weather-icon-spin" />}
            pulse
          >
            <p className="city-card__condition" aria-hidden="true">
              Chargement...
            </p>
          </PlaceholderBody>
        </div>
      )}

      {data && (stale || data.isForecast) && (
        <p className={cn("city-card__status", stale && "city-card__status--stale")}>
          {stale ? (
            <>
              <CloudOff aria-hidden="true" />
              Données de {formatTime(data.fetchedAt, offset)} · mise à jour impossible
            </>
          ) : (
            <>
              <CalendarClock aria-hidden="true" />
              Prévision · {formatDateTime(data.timestamp, offset)}
            </>
          )}
        </p>
      )}

      {(stale && weather.code !== null && RETRYABLE_CODES.has(weather.code)) || selection ? (
        <div className="flex flex-wrap justify-center gap-x-2">
          {stale && weather.code !== null && RETRYABLE_CODES.has(weather.code) && (
            <button
              type="button"
              className="city-card__link"
              aria-label={`Réessayer la mise à jour de ${city.name}`}
              onClick={weather.retry}
            >
              <RotateCw aria-hidden="true" />
              Réessayer
            </button>
          )}
          {selection && (
            <button type="button" className="city-card__link" onClick={() => setSelection(null)}>
              <RotateCcw aria-hidden="true" />
              Maintenant
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function WeatherBody({ data, stale }: { data: WeatherSnapshot; stale: boolean }) {
  const { Icon, tone, motion, filled } = getWeatherVisual(data.conditionId, data.main, data.icon);
  return (
    <div className={cn("flex w-full flex-col items-center", stale && "city-card__stale")}>
      <div className="city-card__icon-wrapper" data-tone={tone}>
        <Icon
          aria-hidden="true"
          strokeWidth={2.25}
          fill={filled ? "currentColor" : "none"}
          className={cn("city-card__icon", MOTION_CLASS[motion])}
        />
      </div>
      <p className="city-card__temp-max">
        <span className="sr-only">Maximum : </span>
        {round(data.tempMax)}°C
      </p>
      <p className="city-card__temp-min">
        <span className="sr-only">Minimum : </span>
        {round(data.tempMin)}°C
      </p>
      <p className="city-card__condition">{capitalize(data.description)}</p>

      <dl className="city-card__details">
        <div title="Température ressentie">
          <dt>
            <Thermometer aria-hidden="true" />
            <span className="sr-only">Ressenti</span>
          </dt>
          <dd>{round(data.feelsLike)}°</dd>
        </div>
        <div title="Humidité">
          <dt>
            <Droplets aria-hidden="true" />
            <span className="sr-only">Humidité</span>
          </dt>
          <dd>{round(data.humidity)} %</dd>
        </div>
        <div title="Vent">
          <dt>
            <Wind aria-hidden="true" />
            <span className="sr-only">Vent</span>
          </dt>
          <dd>{data.windKmh === null ? "—" : `${data.windKmh} km/h`}</dd>
        </div>
        {data.pop !== null && (
          <div title="Probabilité de pluie">
            <dt>
              <Umbrella aria-hidden="true" />
              <span className="sr-only">Probabilité de pluie</span>
            </dt>
            <dd>{Math.round(data.pop * 100)} %</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Pastille + « --° » : même gabarit que la carte remplie (pas de décalage). */
function PlaceholderBody({
  tone,
  icon,
  pulse = false,
  children,
}: {
  tone: "loading" | "idle" | "error";
  icon: ReactNode;
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="city-card__icon-wrapper" data-tone={tone} aria-hidden="true">
        {icon}
      </div>
      <p className={cn("city-card__temp-max", pulse && "city-card__pulse")} aria-hidden="true">
        --°
      </p>
      <p className="city-card__temp-min" aria-hidden="true">
        --°
      </p>
      {children}
    </div>
  );
}

function ErrorBody({
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
    <div role="status" className="w-full">
      <PlaceholderBody tone="error" icon={<AlertTriangle className="city-card__icon" />}>
        <p className="city-card__condition city-card__condition--error">{message}</p>
        {outOfRange ? (
          <button type="button" className="city-card__link" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            Revenir à maintenant
          </button>
        ) : retryable ? (
          <button type="button" className="city-card__link" onClick={onRetry}>
            <RotateCw aria-hidden="true" />
            Réessayer
          </button>
        ) : null}
      </PlaceholderBody>
    </div>
  );
}

export const CityCard = memo(CityCardImpl);
