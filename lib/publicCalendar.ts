import { prisma } from "@/lib/prisma";

/** Calendar data safe to expose to visitors: never client or appointment details. */
export async function getPublicCalendarData(includeLoggedInPromotions = false) {
  const now = new Date();
  const [appointments, blocks, hours, overrides, availableSlots, promotions, events, settings] = await Promise.all([
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, endsAt: { gte: now } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: now } }, select: { startsAt: true, endsAt: true } }),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" }, select: { weekday: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.workingHoursOverride.findMany({ where: { date: { gte: now } }, select: { date: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.availableSlot.findMany({ where: { isPublic: true, endsAt: { gte: now } }, select: { startsAt: true, endsAt: true, isPublic: true } }),
    prisma.promotion.findMany({ where: { active: true, ...(includeLoggedInPromotions ? {} : { isPublic: true }), endsAt: { gte: now } }, select: { id: true, title: true, description: true, badge: true, color: true, startsAt: true, endsAt: true } }),
    prisma.calendarEvent.findMany({ where: { isPublic: true, endsAt: { gte: now } }, select: { id: true, title: true, label: true, description: true, startsAt: true, endsAt: true, color: true } }),
    prisma.siteSetting.findMany({ where: { key: { in: ["booking_buffer_minutes", "calendar_visible_months"] } }, select: { key: true, value: true } }),
  ]);
  const setting = new Map(settings.map((item) => [item.key, item.value]));
  return {
    busy: appointments.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    blocks: blocks.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    hours,
    overrides: overrides.map((item) => ({ ...item, date: item.date.toISOString() })),
    availableSlots: availableSlots.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    promotions: promotions.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    events: events.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() })),
    bufferMinutes: Number(setting.get("booking_buffer_minutes")) || 30,
    visibleMonths: Math.min(12, Math.max(1, Number(setting.get("calendar_visible_months")) || 3)),
  };
}
