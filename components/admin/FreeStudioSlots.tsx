import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { normalizeBookingBufferRules } from "@/lib/bookingRules";
import { formatCoolinkDateTime, normalizeCalendarBlockRange } from "@/lib/dateTime";
export default async function FreeStudioSlots() {
  const now = new Date(), end = new Date(+now + 14 * 86400_000);
  const [slots, visits, blocks, google, settings] = await Promise.all([
    prisma.availableSlot.findMany({ where: { startsAt: { gte: now, lte: end } }, orderBy: { startsAt: "asc" }, take: 100 }),
    prisma.appointment.findMany({ where: { startsAt: { lt: new Date(+end + 86400_000) }, endsAt: { gt: now }, status: { notIn: ["cancelled", "no_show"] }, NOT: { status: "proposed", waitlistOffer: { is: { offerExpiresAt: { lte: now } } } } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityBlock.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: now } } }),
    prisma.googleCalendarEventSync.findMany({ where: { appointmentId: null, remoteDeletedAt: null, syncStatus: "SYNCED", connection: { active: true }, calendarEvent: { startsAt: { lt: end }, endsAt: { gt: now } } }, select: { calendarEvent: { select: { startsAt: true, endsAt: true } } } }),
    prisma.siteSetting.findMany({ where: { key: { in: ["booking_buffer_minutes", "booking_buffer_rules"] } }, select: { key: true, value: true } }),
  ]);
  const config = new Map(settings.map(s => [s.key, s.value]));
  const rawMinutes = Number(config.get("booking_buffer_minutes"));
  let buffer = Number.isInteger(rawMinutes) && rawMinutes >= 0 && rawMinutes <= 240 ? rawMinutes : 30;
  try { const raw = JSON.parse(config.get("booking_buffer_rules") || "null"); if (raw) { const rules = normalizeBookingBufferRules(raw); buffer = Math.max(rules.consultation, rules.tattooShort, rules.tattooLong, ...Object.values(rules.workstations)); } } catch { /* Use the existing fallback. */ }
  const overlaps = (a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }, minutes = 0) => +a.startsAt < +b.endsAt + minutes * 60_000 && +a.endsAt > +b.startsAt - minutes * 60_000;
  // Conservative whole-slot shortlist; partial gaps remain available in the calendar.
  const free = slots.filter(slot => !blocks.some(block => overlaps(slot, normalizeCalendarBlockRange(block))) && !visits.some(visit => overlaps(slot, visit, buffer)) && !google.some(event => event.calendarEvent && overlaps(slot, event.calendarEvent, buffer))).slice(0, 6);
  return <section><div className="divide-y divide-ink-white/10">{free.map(slot => <Link key={slot.id} href="/admin/calendar" className="flex flex-wrap justify-between gap-2 py-3 text-sm"><time dateTime={slot.startsAt.toISOString()}>{formatCoolinkDateTime(slot.startsAt)}</time><span className="text-emerald-200">{Math.round((+slot.endsAt - +slot.startsAt) / 60_000)} min · {slot.title || "Wolny termin"}</span></Link>)}</div>{!free.length && <p className="py-3 text-sm text-ink-grey">Brak całkowicie wolnych okien w najbliższych 14 dniach.</p>}<Link className="mt-3 inline-block text-xs text-ink-gold" href="/admin/calendar">Kalendarz i krótsze wolne okna →</Link></section>;
}
