import { prisma } from "@/lib/prisma";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";
import AdminCalendar from "@/components/admin/AdminCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  const [appointments, projects, blocks, workingHours, overrides, slots, promotions, events, clients, buffer] = await Promise.all([
    prisma.appointment.findMany({ include: { project: { include: { client: true } } }, where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.tattooProject.findMany({ where: { status: { in: ["inquiry", "reviewing", "accepted", "scheduled"] } }, include: { client: true }, orderBy: { updatedAt: "desc" } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.workingHoursOverride.findMany({ where: { date: { gte: from } }, orderBy: { date: "asc" } }),
    prisma.availableSlot.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.promotion.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.calendarEvent.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.client.findMany({ include: { projects: { select: { id: true, title: true }, orderBy: { updatedAt: "desc" } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.siteSetting.findUnique({ where: { key: "booking_buffer_minutes" }, select: { value: true } }),
  ]);

  return <div className="flex flex-col gap-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] tracking-[0.16em] text-ink-gold">WIZYTY I DOSTĘPNOŚĆ</p><h1 className="mt-2 font-display text-3xl text-ink-white">Kalendarz wizyt</h1><p className="mt-2 max-w-2xl text-sm text-ink-grey">Dane klientów widzisz tylko Ty. Klient zobaczy wyłącznie bezpieczny widok dostępności.</p></div><NewAppointmentForm projects={projects} /></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="border border-ink-white/10 p-4"><p className="text-[11px] tracking-[0.12em] text-ink-grey">ZAPLANOWANE WIZYTY</p><p className="mt-2 font-display text-3xl text-ink-white">{appointments.length}</p></div><div className="border border-ink-white/10 p-4"><p className="text-[11px] tracking-[0.12em] text-ink-grey">WYŁĄCZONE TERMINY</p><p className="mt-2 font-display text-3xl text-ink-white">{blocks.length}</p></div><div className="border border-ink-white/10 p-4"><p className="text-[11px] tracking-[0.12em] text-ink-grey">NOWE ZGŁOSZENIA</p><p className="mt-2 font-display text-3xl text-ink-white">{projects.filter((project) => ["inquiry", "reviewing"].includes(project.status)).length}</p></div></div>
    <AdminCalendar appointments={appointments.map((appointment) => ({ id: appointment.id, startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString(), status: appointment.status, clientName: `${appointment.project.client.firstName} ${appointment.project.client.lastName}`, projectTitle: appointment.project.title }))} blocks={blocks.map((block) => ({ id: block.id, startsAt: block.startsAt.toISOString(), endsAt: block.endsAt.toISOString(), reason: block.reason }))} workingHours={workingHours.map((item) => ({ weekday: item.weekday, enabled: item.enabled, startsAt: item.startsAt, endsAt: item.endsAt }))} overrides={overrides.map((item) => ({ id: item.id, date: item.date.toISOString(), enabled: item.enabled, startsAt: item.startsAt, endsAt: item.endsAt, breakStart: item.breakStart, breakEnd: item.breakEnd }))} slots={slots.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), title: item.title, description: item.description, color: item.color, icon: item.icon, isPublic: item.isPublic }))} promotions={promotions.map((item) => ({ id: item.id, title: item.title, description: item.description, badge: item.badge, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), color: item.color, icon: item.icon, isPublic: item.isPublic, active: item.active }))} events={events.map((item) => ({ id: item.id, title: item.title, description: item.description, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), allDay: item.allDay, color: item.color, icon: item.icon, label: item.label, isPublic: item.isPublic }))} bufferMinutes={Number(buffer?.value) || 30} />
  </div>;
}
