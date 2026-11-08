const pad = (n: number) => String(n).padStart(2, "0");

/** Date locale au format AAAA-MM-JJ (pour <input type="date">). */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Heure locale au format HH:MM (pour <input type="time">). */
export function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Combine date + heure locales ; null si la saisie est invalide. */
export function combineLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  const result = new Date(`${date}T${safeTime}`);
  return Number.isNaN(result.getTime()) ? null : result;
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatTime = (date: Date) => timeFormatter.format(date);
export const formatDateTime = (date: Date) => dateTimeFormatter.format(date);
