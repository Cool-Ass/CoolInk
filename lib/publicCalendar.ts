import { prisma } from "@/lib/prisma";

/** Calendar data safe to expose to visitors: never client or appointment details. */
export async function getPublicCalendarData() {
  const now = new Date();
  const [appointments, blocks, hours, overrides, availableSlots, promotions, events, buffer] = await Promise.all([
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, endsAt: { gte: now } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: now } }, select: { startsAt: true, endsAt: true } }),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" }, select: { weekday: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.workingHoursOverride.findMany({ where: { date: { gte: now } }, select: { date: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.availableSlot.findMany({ where: { isPublic: true, endsAt: { gte: now } }, select: { startsAt: true, endsAt: true, isPublic: true } }),
    prisma.promotion.findMany({ where: { active: true, isPublic: true, endsAt: { gte: now } }, select: { id: true, title: true, description: true, badge: true, color: true, startsAt: true, endsAt: true } }),
    prisma.calendarEvent.findMany({ where: { isPublic: true, endsAt: { gte: now } }, select: { id: true, title: true, label: true, description: true, startsAt: true, endsAt: true, color: true } }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);
  return {
    busy: appointments.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    blocks: blocks.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    hours,
    overrides: overrides.map((item) => ({ ...item, date: item.date.toISOString() })),
    availableSlots: availableSlots.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    promotions: promotions.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    events: events.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    bufferMinutes: Number(buffer?.value) || 30,
  };
}
