import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";

export const dynamic = "force-dynamic";

export default async function ClientAppointmentsPage() {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const [projects, appointments, blocks, hours, overrides, availableSlots, promotions, buffer] = await Promise.all([
    prisma.tattooProject.findMany({ where: { clientId: current.id, status: { in: ["inquiry", "reviewing", "accepted", "scheduled"] } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" } }),
    prisma.appointment.findMany({ where: { status: { notIn: ["cancelled", "no_show"] }, endsAt: { gte: new Date() } }, select: { startsAt: true, endsAt: true } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: new Date() } }, select: { startsAt: true, endsAt: true } }),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" }, select: { weekday: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.workingHoursOverride.findMany({ where: { date: { gte: new Date() } }, select: { date: true, enabled: true, startsAt: true, endsAt: true } }),
    prisma.availableSlot.findMany({ where: { isPublic: true, endsAt: { gte: new Date() } }, select: { startsAt: true, endsAt: true, isPublic: true } }),
    prisma.promotion.findMany({ where: { active: true, isPublic: true, endsAt: { gte: new Date() } }, select: { id: true, title: true, description: true, badge: true, startsAt: true, endsAt: true } }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);
  return <main className="min-h-screen bg-ink-black px-6 py-10 text-ink-white md:px-10"><header className="mx-auto flex max-w-6xl items-center justify-between border-b border-ink-white/15 pb-6"><Link href="/app/portal" className="font-display text-2xl tracking-wide">COOLINK</Link><Link href="/app/portal" className="text-xs tracking-[0.08em] text-ink-grey hover:text-ink-gold">← TWOJE KONTO</Link></header><section className="mx-auto max-w-6xl py-12"><p className="text-[11px] tracking-[0.2em] text-ink-gold">KALENDARZ WIZYT</p><h1 className="mt-3 font-display text-4xl md:text-6xl">Zaproponuj termin.</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-grey">Wybierz wolną godzinę dla swojego projektu. Zajęte terminy są oznaczone, ale dane innych klientów pozostają prywatne.</p>{projects.length === 0 ? <div className="mt-8 border border-dashed border-ink-white/25 p-6"><p className="text-sm text-ink-grey">Najpierw wyślij zgłoszenie dotyczące projektu, a potem zaproponujesz termin wizyty.</p><Link href="/app/new-project" className="mt-4 inline-block border border-ink-gold px-4 py-2.5 text-xs text-ink-gold">NOWE ZGŁOSZENIE</Link></div> : <ClientBookingCalendar projects={projects} busy={appointments.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} blocks={blocks.map((item) => ({ startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} hours={hours} overrides={overrides.map((item) => ({ ...item, date: item.date.toISOString() }))} availableSlots={availableSlots.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} bufferMinutes={Number(buffer?.value) || 30} promotions={promotions.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString() }))} />}</section></main>;
}
