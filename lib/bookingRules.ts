import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalizeCalendarBlockRange } from "@/lib/dateTime";

const DEFAULT_BUFFER_MINUTES = 30;

type BookingDb = typeof prisma | Prisma.TransactionClient;

export async function lockBookingCalendar(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260905)`;
}

export async function getBookingBufferMinutes(db: BookingDb = prisma) {
  const setting = await db.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } });
  const value = Number(setting?.value);
  return Number.isInteger(value) && value >= 0 && value <= 240 ? value : DEFAULT_BUFFER_MINUTES;
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

export async function bookingConflict(startsAt: Date, endsAt: Date, excludeAppointmentId?: string, includeBuffer = true, db: BookingDb = prisma) {
  const bufferMinutes = includeBuffer ? await getBookingBufferMinutes(db) : 0;
  const bufferedStart = new Date(startsAt.getTime() - bufferMinutes * 60_000);
  const bufferedEnd = new Date(endsAt.getTime() + bufferMinutes * 60_000);
  const [appointment, blockCandidates, externalBusy] = await Promise.all([
    db.appointment.findFirst({ where: { ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}), status: { notIn: ["cancelled", "no_show"] }, NOT: { status: "proposed", waitlistOffer: { is: { offerExpiresAt: { lte: new Date() } } } }, startsAt: { lt: bufferedEnd }, endsAt: { gt: bufferedStart } } }),
    db.availabilityBlock.findMany({ where: { startsAt: { lt: new Date(endsAt.getTime() + 3 * 60 * 60 * 1000) }, endsAt: { gt: new Date(startsAt.getTime() - 3 * 60 * 60 * 1000) } } }),
    db.googleCalendarEventSync.findFirst({ where: { appointmentId: null, remoteDeletedAt: null, syncStatus: "SYNCED", calendarEvent: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }, select: { id: true } }),
  ]);
  const block = blockCandidates.find((item) => { const range = normalizeCalendarBlockRange(item); return range.startsAt < endsAt && range.endsAt > startsAt; });
  return { appointment, block: block || externalBusy, bufferMinutes };
}
