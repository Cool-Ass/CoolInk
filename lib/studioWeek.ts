import { localDateTimeToIso, toCoolinkDateTimeInput } from "@/lib/dateTime";

/** Calendar arithmetic uses Warsaw wall-clock dates, not browser time zones. */
export function studioWeekDays(anchor: string) {
  const date = new Date(anchor.slice(0, 10) + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(date); next.setUTCDate(next.getUTCDate() + index);
    return next.toISOString().slice(0, 10);
  });
}
export function shiftStudioDate(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z"); date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function movedVisitRange(visit: { startsAt: string; endsAt: string }, day: string, hour?: number) {
  const clock = hour === undefined ? toCoolinkDateTimeInput(visit.startsAt).slice(11) : String(hour).padStart(2, "0") + ":00";
  const startsAt = localDateTimeToIso(day + "T" + clock);
  return { startsAt, endsAt: new Date(+new Date(startsAt) + (+new Date(visit.endsAt) - +new Date(visit.startsAt))).toISOString() };
}
