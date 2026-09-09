export const COOLINK_TIME_ZONE = "Europe/Warsaw";

type DateTimeOptions = Intl.DateTimeFormatOptions;

function asDate(value: Date | string | number) {
  return value instanceof Date ? value : new Date(value);
}

export function formatCoolinkDateTime(value: Date | string | number, options: DateTimeOptions = { dateStyle: "medium", timeStyle: "short" }) {
  return new Intl.DateTimeFormat("pl-PL", { ...options, timeZone: COOLINK_TIME_ZONE }).format(asDate(value));
}

export function formatCoolinkDate(value: Date | string | number, options: DateTimeOptions = { dateStyle: "long" }) {
  return formatCoolinkDateTime(value, options);
}

export function formatCoolinkTime(value: Date | string | number, options: DateTimeOptions = { hour: "2-digit", minute: "2-digit" }) {
  return formatCoolinkDateTime(value, options);
}

/** Convert a studio wall-clock `datetime-local` value to an unambiguous instant. */
export function localDateTimeToIso(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return "";
  return coolinkLocalToInstant(Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4]), Number(match[5])).toISOString();
}

/** Format an instant for a `datetime-local` control in the studio time zone. */
export function toCoolinkDateTimeInput(value: Date | string | number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COOLINK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(asDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function coolinkOffsetMs(value: Date) {
  const label = new Intl.DateTimeFormat("en", { timeZone: COOLINK_TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(value)
    .find((item) => item.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "+" ? 1 : -1) * minutes * 60_000;
}

function coolinkLocalToInstant(year: number, month: number, day: number, hour = 0, minute = 0) {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(wallClockAsUtc - coolinkOffsetMs(new Date(wallClockAsUtc)));
  instant = new Date(wallClockAsUtc - coolinkOffsetMs(instant));
  return instant;
}

/** Exact start/end instants of the calendar day used by the Warsaw studio. */
export function coolinkDayRange(value: Date | string | number = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: COOLINK_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(asDate(value));
  const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const year = number("year");
  const month = number("month");
  const day = number("day");
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    start: coolinkLocalToInstant(year, month, day),
    end: coolinkLocalToInstant(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate()),
  };
}
