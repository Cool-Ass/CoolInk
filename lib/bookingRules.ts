import { prisma } from "@/lib/prisma";

const DEFAULT_BUFFER_MINUTES = 30;

export async function getBookingBufferMinutes() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } });
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

export async function bookingConflict(startsAt: Date, endsAt: Date, excludeAppointmentId?: string, includeBuffer = true) {
  const bufferMinutes = includeBuffer ? await getBookingBufferMinutes() : 0;
  const bufferedStart = new Date(startsAt.getTime() - bufferMinutes * 60_000);
  const bufferedEnd = new Date(endsAt.getTime() + bufferMinutes * 60_000);
  const [appointment, block, externalBusy] = await Promise.all([
    prisma.appointment.findFirst({ where: { ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}), status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: bufferedEnd }, endsAt: { gt: bufferedStart } } }),
    prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }),
    prisma.googleCalendarEventSync.findFirst({ where: { appointmentId: null, remoteDeletedAt: null, syncStatus: "SYNCED", calendarEvent: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }, select: { id: true } }),
  ]);
  return { appointment, block: block || externalBusy, bufferMinutes };
}
