export type CalendarItemKind = "appointment" | "freeTerm" | "workingHours" | "dayOff" | "promotion" | "event";

/** Cancelled records are audit history, not operational calendar entries. */
export function isOperationalCalendarAppointment(status: string) {
  return status !== "cancelled";
}

export function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function localDateKey(value: Date) {
  const date = startOfLocalDay(value);
  const part = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`;
}

export function selectedDateRange(from: Date, to: Date) {
  const start = startOfLocalDay(from);
  const end = startOfLocalDay(to);
  const direction = start <= end ? 1 : -1;
  const dates: Date[] = [];
  const cursor = new Date(start);
  while ((direction > 0 && cursor <= end) || (direction < 0 && cursor >= end)) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + direction);
  }
  return dates;
}

export function mergeSelectedDates(current: Date[], clicked: Date, options: { additive?: boolean; rangeFrom?: Date | null } = {}) {
  const key = localDateKey(clicked);
  if (options.rangeFrom) return selectedDateRange(options.rangeFrom, clicked);
  if (!options.additive) return [startOfLocalDay(clicked)];
  const existing = new Map(current.map((date) => [localDateKey(date), startOfLocalDay(date)]));
  if (existing.has(key)) existing.delete(key); else existing.set(key, startOfLocalDay(clicked));
  return [...existing.values()].sort((a, b) => a.getTime() - b.getTime());
}

export function isHexColor(value: string) { return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?$/i.test(value); }

export type HoursRule = { enabled: boolean; startsAt: string; endsAt: string; note?: string | null };
export type RecurringHoursRule = HoursRule & { weekday: number };
export type DateHoursOverride = HoursRule & { date: Date };

/**
 * The only precedence rule for studio opening hours. A date exception never
 * changes the repeating schedule; it just wins for that one calendar date.
 */
export function effectiveWorkingHours(date: Date, recurring: RecurringHoursRule[], overrides: DateHoursOverride[]) {
  const override = overrides.find((item) => localDateKey(item.date) === localDateKey(date));
  if (override) return { ...override, source: "override" as const };
  return { ...(recurring.find((item) => item.weekday === date.getDay()) ?? { enabled: false, startsAt: "00:00", endsAt: "00:00" }), source: "recurring" as const };
}

export type AvailabilityAppointment = { startsAt: Date; endsAt: Date; status?: string };
export type AvailabilityBlock = { startsAt: Date; endsAt: Date };
export type ExplicitAvailableSlot = { startsAt: Date; endsAt: Date; isPublic?: boolean };
export type TimeRange = { startsAt: Date; endsAt: Date };

export type CalendarDayStatus = "default" | "available" | "unavailable";

/**
 * Visual day status used by both calendar surfaces. A Sunday is unavailable
 * by default, but an explicit available slot is an intentional admin override.
 */
export function calendarDayStatus(date: Date, slots: ExplicitAvailableSlot[], blocks: AvailabilityBlock[]): CalendarDayStatus {
  const day = { startsAt: startOfLocalDay(date), endsAt: new Date(startOfLocalDay(date).getTime() + 24 * 60 * 60 * 1000) };
  if (blocks.some((block) => overlaps(day, block))) return "unavailable";
  if (slots.some((slot) => overlaps(day, slot))) return "available";
  return date.getDay() === 0 ? "unavailable" : "default";
}

function overlaps(a: TimeRange, b: TimeRange) {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

function subtractRange(source: TimeRange, occupied: TimeRange) {
  if (!overlaps(source, occupied)) return [source];
  const result: TimeRange[] = [];
  if (source.startsAt < occupied.startsAt) result.push({ startsAt: source.startsAt, endsAt: new Date(Math.min(source.endsAt.getTime(), occupied.startsAt.getTime())) });
  if (source.endsAt > occupied.endsAt) result.push({ startsAt: new Date(Math.max(source.startsAt.getTime(), occupied.endsAt.getTime())), endsAt: source.endsAt });
  return result.filter((range) => range.startsAt < range.endsAt);
}

/**
 * Single availability resolver shared by the calendar surfaces. The ordering
 * is deliberate: a hard day block wins, appointments consume their buffer,
 * and only explicit slots are availability. Working hours are operational
 * configuration only: they must never make a day bookable for a client.
 */
export function resolveAvailableRanges({
  date,
  recurring,
  overrides,
  slots,
  blocks,
  appointments,
  bufferMinutes = 0,
  publicOnly = false,
}: {
  date: Date;
  recurring: RecurringHoursRule[];
  overrides: DateHoursOverride[];
  slots: ExplicitAvailableSlot[];
  blocks: AvailabilityBlock[];
  appointments: AvailabilityAppointment[];
  bufferMinutes?: number;
  publicOnly?: boolean;
}) {
  const dayStart = startOfLocalDay(date);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const day = { startsAt: dayStart, endsAt: dayEnd };
  if (blocks.some((block) => overlaps(day, block))) return [] as TimeRange[];

  // Keep these inputs in the public resolver signature so older callers stay
  // compatible, but deliberately do not turn them into availability.
  void recurring;
  void overrides;
  const explicit = slots
    .filter((slot) => !publicOnly || slot.isPublic !== false)
    .filter((slot) => overlaps(day, slot))
    .map((slot) => ({ startsAt: new Date(Math.max(slot.startsAt.getTime(), dayStart.getTime())), endsAt: new Date(Math.min(slot.endsAt.getTime(), dayEnd.getTime())) }));
  const candidates = explicit;
  const occupied = appointments
    .filter((appointment) => isOperationalCalendarAppointment(appointment.status ?? "confirmed"))
    .map((appointment) => ({
      startsAt: new Date(appointment.startsAt.getTime() - bufferMinutes * 60_000),
      endsAt: new Date(appointment.endsAt.getTime() + bufferMinutes * 60_000),
    }));

  return occupied.reduce<TimeRange[]>((ranges, appointment) => ranges.flatMap((range) => subtractRange(range, appointment)), candidates)
    .filter((range) => range.startsAt < range.endsAt)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function rangeCanFit(ranges: TimeRange[], startsAt: Date, endsAt: Date) {
  return ranges.some((range) => range.startsAt <= startsAt && range.endsAt >= endsAt);
}

export async function runAtomicBulk<T>(transaction: (work: () => Promise<T[]>) => Promise<T[]>, operations: Array<() => Promise<T>>) {
  // The caller supplies Prisma's interactive transaction. The operations are
  // deliberately created inside it, so a rejected member rolls the whole set back.
  return transaction(() => Promise.all(operations.map((operation) => operation())));
}
