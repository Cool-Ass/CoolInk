export const WAITLIST_STATUSES = ["active", "offered", "booked", "paused", "closed"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const WAITLIST_STATUS_LABEL: Record<WaitlistStatus, string> = {
  active: "Oczekuje na termin",
  offered: "Oferta wysłana",
  booked: "Termin przyjęty",
  paused: "Wstrzymana",
  closed: "Zamknięta",
};

export const WAITLIST_TIME_LABEL = {
  any: "Dowolna pora",
  morning: "Rano (do 12:00)",
  afternoon: "Po południu (12:00–17:00)",
  evening: "Wieczorem (od 17:00)",
} as const;

export type WaitlistTimePreference = keyof typeof WAITLIST_TIME_LABEL;

export function normalizeWaitlistWeekdays(value: unknown) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  const days = Array.from(new Set(source.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort();
  return days.length ? days : [1, 2, 3, 4, 5];
}

export function normalizeWaitlistDuration(value: unknown) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 30 || duration > 720 || duration % 30 !== 0) return null;
  return duration;
}

export function normalizeWaitlistTime(value: unknown): WaitlistTimePreference {
  const time = String(value ?? "any");
  return time in WAITLIST_TIME_LABEL ? time as WaitlistTimePreference : "any";
}

export function parseWaitlistDate(value: unknown) {
  const source = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) return null;
  const parsed = new Date(`${source}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function warsawDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const weekday = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[part("weekday")];
  return { key: `${part("year")}-${part("month")}-${part("day")}`, weekday, hour: Number(part("hour")) };
}

export function waitlistDateMatches(entry: { earliestDate: Date | null; latestDate: Date | null; preferredWeekdays: string; timePreference: string; durationMinutes: number }, startsAt: Date, endsAt: Date) {
  const local = warsawDateParts(startsAt);
  if (entry.earliestDate && local.key < entry.earliestDate.toISOString().slice(0, 10)) return false;
  if (entry.latestDate && local.key > entry.latestDate.toISOString().slice(0, 10)) return false;
  if (!normalizeWaitlistWeekdays(entry.preferredWeekdays).includes(local.weekday)) return false;
  const minutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  if (minutes < entry.durationMinutes) return false;
  const hour = local.hour;
  if (entry.timePreference === "morning" && hour >= 12) return false;
  if (entry.timePreference === "afternoon" && (hour < 12 || hour >= 17)) return false;
  if (entry.timePreference === "evening" && hour < 17) return false;
  return true;
}
