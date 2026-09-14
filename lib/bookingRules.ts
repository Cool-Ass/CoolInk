import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeCalendarBlockRange } from "@/lib/dateTime";

const DEFAULT_BUFFER_MINUTES = 30;

type BookingDb = typeof prisma | Prisma.TransactionClient;
export type BookingContext = { serviceType?: string | null; durationMinutes?: number; workstation?: string | null };
export type BookingBufferRules = { consultation: number; tattooShort: number; tattooLong: number; longSessionFromMinutes: number; workstations: Record<string, number> };

export const DEFAULT_BOOKING_BUFFER_RULES: BookingBufferRules = { consultation: 15, tattooShort: 30, tattooLong: 45, longSessionFromMinutes: 240, workstations: {} };

export type BookingBufferConfiguration = { fallback: number; rules: BookingBufferRules | null };

function boundedMinutes(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 240 ? number : fallback;
}

export function normalizeBookingBufferRules(value: unknown): BookingBufferRules {
  const input = value && typeof value === "object" ? value as Partial<BookingBufferRules> : {};
  const workstations = input.workstations && typeof input.workstations === "object"
    ? Object.fromEntries(Object.entries(input.workstations).map(([key, minutes]) => [key.trim().slice(0, 80), boundedMinutes(minutes, DEFAULT_BUFFER_MINUTES)]).filter(([key]) => key))
    : {};
  return {
    consultation: boundedMinutes(input.consultation, DEFAULT_BOOKING_BUFFER_RULES.consultation),
    tattooShort: boundedMinutes(input.tattooShort, DEFAULT_BOOKING_BUFFER_RULES.tattooShort),
    tattooLong: boundedMinutes(input.tattooLong, DEFAULT_BOOKING_BUFFER_RULES.tattooLong),
    longSessionFromMinutes: Math.min(720, Math.max(60, Number(input.longSessionFromMinutes) || DEFAULT_BOOKING_BUFFER_RULES.longSessionFromMinutes)),
    workstations,
  };
}

export async function lockBookingCalendar(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260905)`;
}

async function getBookingBufferConfiguration(db: BookingDb): Promise<BookingBufferConfiguration> {
  const [setting, rulesSetting] = await Promise.all([
    db.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
    db.siteSetting.findUnique({ where: { key: "booking_buffer_rules" }, select: { value: true } }),
  ]);
  const value = Number(setting?.value);
  const fallback = Number.isInteger(value) && value >= 0 && value <= 240 ? value : DEFAULT_BUFFER_MINUTES;
  let raw: unknown = null;
  try { raw = JSON.parse(rulesSetting?.value || "null"); } catch { raw = null; }
  return { fallback, rules: raw ? normalizeBookingBufferRules(raw) : null };
}

export function resolveBookingBufferMinutes(configuration: BookingBufferConfiguration, context: BookingContext) {
  if (!configuration.rules) return configuration.fallback;
  const rules = configuration.rules;
  const duration = context.durationMinutes ?? 0;
  const service = (context.serviceType || "").toLowerCase();
  const serviceBuffer = service.includes("consult") || service.includes("konsult")
    ? rules.consultation
    : duration >= rules.longSessionFromMinutes ? rules.tattooLong : rules.tattooShort;
  const workstationBuffer = context.workstation ? rules.workstations[context.workstation] : undefined;
  return Math.max(serviceBuffer, workstationBuffer ?? 0);
}

export async function getBookingBufferMinutes(db: BookingDb = prisma, context: BookingContext = {}) {
  return resolveBookingBufferMinutes(await getBookingBufferConfiguration(db), context);
}

export function validAppointmentRange(startsAt: Date, endsAt: Date) {
  const duration = endsAt.getTime() - startsAt.getTime();
  return !Number.isNaN(startsAt.getTime())
    && !Number.isNaN(endsAt.getTime())
    && startsAt < endsAt
    && startsAt.getMinutes() % 30 === 0
    && duration >= 30 * 60 * 1000
    && duration <= 12 * 60 * 60 * 1000
    && duration % (30 * 60 * 1000) === 0;
}

export async function bookingConflict(startsAt: Date, endsAt: Date, excludeAppointmentId?: string, includeBuffer = true, db: BookingDb = prisma, context: BookingContext = {}) {
  const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
  const configuration = await getBookingBufferConfiguration(db);
  const requestedBuffer = includeBuffer ? resolveBookingBufferMinutes(configuration, { ...context, durationMinutes: context.durationMinutes ?? durationMinutes }) : 0;
  const searchBuffer = includeBuffer ? 240 : 0;
  const searchStart = new Date(startsAt.getTime() - searchBuffer * 60_000);
  const searchEnd = new Date(endsAt.getTime() + searchBuffer * 60_000);
  const [appointmentCandidates, blockCandidates, externalBusy] = await Promise.all([
    db.appointment.findMany({ where: { ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}), status: { notIn: ["cancelled", "no_show"] }, NOT: { status: "proposed", waitlistOffer: { is: { offerExpiresAt: { lte: new Date() } } } }, startsAt: { lt: searchEnd }, endsAt: { gt: searchStart } }, orderBy: { startsAt: "asc" }, select: { id: true, startsAt: true, endsAt: true, serviceType: true, workstation: true, project: { select: { title: true } } } }),
    db.availabilityBlock.findMany({ where: { startsAt: { lt: new Date(endsAt.getTime() + 3 * 60 * 60 * 1000) }, endsAt: { gt: new Date(startsAt.getTime() - 3 * 60 * 60 * 1000) } } }),
    db.googleCalendarEventSync.findFirst({ where: { appointmentId: null, remoteDeletedAt: null, syncStatus: "SYNCED", calendarEvent: { startsAt: { lt: new Date(endsAt.getTime() + requestedBuffer * 60_000) }, endsAt: { gt: new Date(startsAt.getTime() - requestedBuffer * 60_000) } } }, select: { id: true } }),
  ]);
  const matches = appointmentCandidates.map((candidate) => {
    const existingDuration = Math.round((candidate.endsAt.getTime() - candidate.startsAt.getTime()) / 60_000);
    const existingBuffer = includeBuffer ? resolveBookingBufferMinutes(configuration, { serviceType: candidate.serviceType, workstation: candidate.workstation, durationMinutes: existingDuration }) : 0;
    const bufferMinutes = Math.max(requestedBuffer, existingBuffer);
    const overlaps = candidate.startsAt < new Date(endsAt.getTime() + bufferMinutes * 60_000) && candidate.endsAt > new Date(startsAt.getTime() - bufferMinutes * 60_000);
    const direct = candidate.startsAt < endsAt && candidate.endsAt > startsAt;
    return { candidate, bufferMinutes, overlaps, direct };
  });
  const match = matches.find((item) => item.direct) ?? matches.find((item) => item.overlaps) ?? null;
  const appointment = match?.candidate ?? null;
  const bufferMinutes = match?.bufferMinutes ?? requestedBuffer;
  const block = blockCandidates.find((item) => { const range = normalizeCalendarBlockRange(item); return range.startsAt < endsAt && range.endsAt > startsAt; });
  const reason = appointment
    ? appointment.startsAt < endsAt && appointment.endsAt > startsAt
      ? { code: "APPOINTMENT" as const, label: `Koliduje z wizytą „${appointment.project.title}” (${appointment.startsAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })}–${appointment.endsAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" })}).` }
      : { code: "BUFFER" as const, label: `Narusza ${bufferMinutes}-minutowy bufor przy wizycie „${appointment.project.title}”.` }
    : block
      ? { code: "BLOCK" as const, label: `Koliduje z blokadą: ${block.reason || "niedostępny termin"}.` }
      : externalBusy
        ? { code: "GOOGLE_BUSY" as const, label: "Koliduje z zajętością w Google Calendar." }
        : null;
  return { appointment, block: block || externalBusy, bufferMinutes, reason };
}

export function bookingConflictMessage(conflict: Awaited<ReturnType<typeof bookingConflict>>) {
  return conflict.reason?.label || "Termin jest niedostępny.";
}
