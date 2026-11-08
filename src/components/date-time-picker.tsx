import { CalendarDays, Clock, RotateCcw } from "lucide-react";
import { type KeyboardEvent, useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Sélecteur date + heure remplaçant les <input type="date"> / <input type="time">.
 *
 * Toutes les valeurs sont des chaînes dans l'heure locale de la ville
 * (« AAAA-MM-JJ », « HH:MM »), jamais interprétées dans le fuseau du
 * navigateur : les objets Date ne servent qu'à l'affichage du calendrier
 * (minuit local, aller-retour sans décalage).
 */
export interface DateTimePickerProps {
  /** Date choisie, « AAAA-MM-JJ » (heure locale de la ville). */
  date: string;
  /** Heure choisie, « HH:MM » (heure locale de la ville). */
  time: string;
  /** Premier jour sélectionnable (aujourd'hui pour la ville). */
  minDate: string;
  /** Dernier jour sélectionnable (horizon des prévisions). */
  maxDate: string;
  /** Heure minimale, appliquée seulement le jour `minDate` (heure actuelle). */
  minTime?: string;
  /** Heure maximale, appliquée seulement le jour `maxDate` (fin des prévisions). */
  maxTime?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  /** Bouton « Maintenant » : revient aux conditions actuelles. */
  onReset?: () => void;
  disabled?: boolean;
  /** Nom de la ville, pour les libellés accessibles. */
  cityName: string;
  /** Libellé du fuseau (« GMT », « GMT+1 »…), affiché en info-bulle / aria. */
  tzLabel?: string;
  /** Préfixe d'identifiants : `${idPrefix}-date` et `${idPrefix}-time`. */
  idPrefix: string;
  /** Pas des créneaux horaires, en minutes (30 par défaut). */
  stepMinutes?: number;
  className?: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** « AAAA-MM-JJ » → Date à minuit dans le fuseau du navigateur (affichage seulement). */
function toCalendarDate(value: string): Date | undefined {
  const m = DATE_PATTERN.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date du calendrier → « AAAA-MM-JJ » (lecture des champs locaux, sans conversion). */
const fromCalendarDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Formateurs créés une seule fois : construire un Intl.DateTimeFormat coûte cher
 * (mesuré ~20 ms), et chaque carte en formate deux à chaque rendu.
 */
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const LONG_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** « AAAA-MM-JJ » formaté en UTC (aucun décalage possible). */
function formatDateLabel(value: string, format: Intl.DateTimeFormat): string {
  const m = DATE_PATTERN.exec(value);
  if (!m) return value;
  return format.format(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

const toMinutes = (value: string | undefined): number | null => {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const fromMinutes = (total: number) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;

const triggerClass =
  "inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-3 text-sm font-medium tabular-nums text-foreground transition-transform duration-150 ease-out hover:border-primary/40 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-[state=open]:border-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary dark:data-[state=open]:text-blue-300 pointer-coarse:min-h-11 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground data-[state=open]:[&_svg]:text-primary dark:data-[state=open]:[&_svg]:text-blue-300";

const footerButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-primary transition-transform duration-150 hover:bg-primary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 pointer-coarse:min-h-11 [&_svg]:size-4";

const TIME_COLUMNS = 4;

export function DateTimePicker({
  date,
  time,
  minDate,
  maxDate,
  minTime,
  maxTime,
  onDateChange,
  onTimeChange,
  onReset,
  disabled = false,
  cityName,
  tzLabel,
  idPrefix,
  stepMinutes = 30,
  className,
}: DateTimePickerProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const selectedDay = toCalendarDate(date);
  const firstDay = toCalendarDate(minDate);
  const lastDay = toCalendarDate(maxDate);
  const [month, setMonth] = useState<Date | undefined>(selectedDay);

  const tzSuffix = tzLabel ? ` (heure locale, ${tzLabel})` : "";
  const shortDate = formatDateLabel(date, SHORT_DATE_FORMAT);
  const longDate = formatDateLabel(date, LONG_DATE_FORMAT);

  // Créneaux du jour choisi, bornés par minTime (premier jour) et maxTime (dernier).
  const slots = useMemo(() => {
    const lo = date === minDate ? (toMinutes(minTime) ?? 0) : 0;
    const hi = date === maxDate ? (toMinutes(maxTime) ?? 24 * 60 - 1) : 24 * 60 - 1;
    const list: string[] = [];
    for (let t = Math.ceil(lo / stepMinutes) * stepMinutes; t <= hi; t += stepMinutes) {
      list.push(fromMinutes(t));
    }
    return list;
  }, [date, minDate, maxDate, minTime, maxTime, stepMinutes]);

  const handleDateOpen = (open: boolean) => {
    if (open) setMonth(selectedDay);
    setDateOpen(open);
  };

  const pickDate = (value: string) => {
    onDateChange(value);
    setDateOpen(false);
  };

  const pickTime = (value: string) => {
    onTimeChange(value);
    setTimeOpen(false);
  };

  const pickNow = () => {
    if (onReset) onReset();
    else if (minTime) {
      onDateChange(minDate);
      onTimeChange(minTime);
    }
    setTimeOpen(false);
  };

  // Navigation au clavier dans la grille des créneaux (flèches, Début, Fin).
  const handleGridKeyDown = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: TIME_COLUMNS,
      ArrowUp: -TIME_COLUMNS,
      Home: -index,
      End: buttons.length - 1 - index,
    };
    const delta = moves[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = Math.min(buttons.length - 1, Math.max(0, index + delta));
    buttons[next]?.focus();
  };

  return (
    <div className={cn("flex w-full items-stretch gap-2", className)}>
      <Popover open={dateOpen} onOpenChange={handleDateOpen}>
        <PopoverTrigger
          id={`${idPrefix}-date`}
          type="button"
          disabled={disabled}
          className={triggerClass}
          aria-label={`Date pour ${cityName} : ${longDate}${tzSuffix}`}
          title={tzLabel ? `Date locale (${tzLabel})` : undefined}
        >
          <CalendarDays aria-hidden="true" />
          <span className="block truncate first-letter:uppercase">{shortDate}</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-2 sm:p-3"
          aria-label={`Choisir la date pour ${cityName}`}
          // Le focus va au jour sélectionné (autoFocus de DayPicker), pas aux flèches.
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Calendar
            mode="single"
            required
            autoFocus
            selected={selectedDay}
            onSelect={(day) => day && pickDate(fromCalendarDate(day))}
            month={month}
            onMonthChange={setMonth}
            startMonth={firstDay}
            endMonth={lastDay}
            today={firstDay}
            disabled={[
              ...(firstDay ? [{ before: firstDay }] : []),
              ...(lastDay ? [{ after: lastDay }] : []),
            ]}
          />
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="px-1 text-xs text-muted-foreground">
              {tzLabel ? `Heure locale ${tzLabel}` : "Heure locale"}
            </span>
            <button
              type="button"
              className={footerButtonClass}
              disabled={date === minDate}
              onClick={() => pickDate(minDate)}
            >
              Aujourd&apos;hui
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger
          id={`${idPrefix}-time`}
          type="button"
          disabled={disabled}
          className={cn(triggerClass, "flex-none")}
          aria-label={`Heure pour ${cityName} : ${time}${tzSuffix}`}
          title={tzLabel ? `Heure locale (${tzLabel})` : undefined}
        >
          <Clock aria-hidden="true" />
          <span>{time}</span>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64 p-2 pointer-coarse:w-72"
          aria-label={`Choisir l'heure pour ${cityName}`}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const root = event.currentTarget as HTMLElement | null;
            const slotButtons = Array.from(
              root?.querySelectorAll<HTMLButtonElement>("[data-slot=time-slot]") ?? [],
            );
            // Heure hors pas (ex. 18:52) : créneau suivant le plus proche, sinon le dernier.
            const target =
              root?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ??
              slotButtons.find((button) => (button.textContent ?? "") >= time) ??
              slotButtons.at(-1);
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: "center" });
          }}
        >
          <p className="px-1 pb-2 text-xs font-medium text-muted-foreground first-letter:uppercase">
            {shortDate}
            {tzLabel ? ` · ${tzLabel}` : ""}
          </p>
          {slots.length > 0 ? (
            <fieldset
              aria-label="Créneaux horaires"
              className="grid min-w-0 max-h-56 grid-cols-4 gap-1 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]"
              onKeyDown={handleGridKeyDown}
            >
              {slots.map((slot) => {
                const selected = slot === time;
                return (
                  <button
                    key={slot}
                    type="button"
                    data-slot="time-slot"
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex min-h-9 items-center justify-center rounded-lg text-sm tabular-nums transition-transform duration-150 hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-95 pointer-coarse:min-h-11",
                      selected &&
                        "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                    )}
                    onClick={() => pickTime(slot)}
                  >
                    {slot}
                  </button>
                );
              })}
            </fieldset>
          ) : (
            <p className="px-1 py-3 text-sm text-muted-foreground">
              Aucun créneau disponible ce jour.
            </p>
          )}
          {(onReset || minTime) && (
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button type="button" className={footerButtonClass} onClick={pickNow}>
                <RotateCcw aria-hidden="true" />
                Maintenant
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
