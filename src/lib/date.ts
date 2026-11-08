/**
 * Dates et heures exprimées dans l'heure locale de la ville, jamais dans le
 * fuseau du navigateur. Une ville est décrite par son décalage UTC en secondes
 * (0 pour la Côte d'Ivoire, Africa/Abidjan, sans heure d'été ; valeur
 * `timezone` renvoyée par OpenWeatherMap pour les villes internationales).
 *
 * Principe : on décale l'horodatage du nombre de secondes du fuseau, puis on
 * lit / formate le résultat en UTC.
 */

/** Décalage de la Côte d'Ivoire (Africa/Abidjan = UTC+0). */
export const CI_UTC_OFFSET_SEC = 0;

const pad = (n: number) => String(n).padStart(2, "0");

const shifted = (ms: number, offsetSec: number) => new Date(ms + offsetSec * 1000);

/** Date locale de la ville au format AAAA-MM-JJ (pour <input type="date">). */
export function toDateInputValue(ms: number, offsetSec: number): string {
  const d = shifted(ms, offsetSec);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Heure locale de la ville au format HH:MM (pour <input type="time">). */
export function toTimeInputValue(ms: number, offsetSec: number): string {
  const d = shifted(ms, offsetSec);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

/**
 * Combine une date et une heure saisies dans l'heure locale de la ville.
 * Renvoie l'horodatage UTC (ms), ou null si la saisie est vide ou invalide.
 */
export function combineLocal(date: string, time: string, offsetSec: number): number | null {
  const dm = DATE_PATTERN.exec(date);
  const tm = TIME_PATTERN.exec(time);
  if (!dm || !tm) return null;
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const utc = Date.UTC(y, mo - 1, d, h, mi);
  // Rejette les dates inexistantes (ex. 31 février) que Date.UTC « déborderait »,
  // et les années 0000-0099, que Date.UTC réinterprète en 1900-1999.
  const check = new Date(utc);
  if (check.getUTCDate() !== d || check.getUTCFullYear() !== y) return null;
  return utc - offsetSec * 1000;
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** HH:MM dans l'heure locale de la ville. */
export const formatTime = (ms: number, offsetSec: number) =>
  timeFormatter.format(shifted(ms, offsetSec));

/** « sam. 8 nov., 14:00 » dans l'heure locale de la ville. */
export const formatDateTime = (ms: number, offsetSec: number) =>
  dateTimeFormatter.format(shifted(ms, offsetSec));

/** Libellé du fuseau : « GMT », « GMT+1 », « GMT-3:30 ». */
export function formatUtcOffset(offsetSec: number): string {
  // Arrondi à la minute avant le découpage : 3599 s donne « GMT+1 », pas « GMT+0:60 ».
  const totalMinutes = Math.round(Math.abs(offsetSec) / 60);
  if (totalMinutes === 0) return "GMT";
  const sign = offsetSec > 0 ? "+" : "-";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `GMT${sign}${hours}${minutes ? `:${pad(minutes)}` : ""}`;
}
