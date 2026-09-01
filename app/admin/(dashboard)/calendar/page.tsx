import { prisma } from "@/lib/prisma";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";
import CalendarHub from "@/components/admin/CalendarHub";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  const [appointments, projects, blocks, slots, promotions, events, clients, settings] = await Promise.all([
    // Cancelled appointments remain in client/project history, but do not take
    // part in the operational calendar dataset.
    prisma.appointment.findMany({ include: { project: { include: { client: true } } }, where: { endsAt: { gte: from }, status: { not: "cancelled" } }, orderBy: { startsAt: "asc" } }),
    prisma.tattooProject.findMany({ where: { status: { in: ["inquiry", "reviewing", "accepted", "scheduled"] } }, include: { client: true }, orderBy: { updatedAt: "desc" } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.availableSlot.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.promotion.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.calendarEvent.findMany({ where: { endsAt: { gte: from } }, include: { googleCalendarSync: { select: { syncStatus: true } } }, orderBy: { startsAt: "asc" } }),
    prisma.client.findMany({ include: { projects: { select: { id: true, title: true }, orderBy: { updatedAt: "desc" } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.siteSetting.findMany({ where: { key: { in: ["booking_buffer_minutes", "calendar_visible_months", "calendar_default_free_start", "calendar_default_free_end"] } }, select: { key: true, value: true } }),
  ]);
  const setting = new Map(settings.map((item) => [item.key, item.value]));

  return <div className="flex flex-col gap-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-3xl text-ink-white">Kalendarz wizyt</h1><NewAppointmentForm projects={projects} /></div>
    <CalendarHub stats={{ appointments: appointments.length, blocks: blocks.length, newProjects: projects.filter((project) => ["inquiry", "reviewing"].includes(project.status)).length }} appointments={appointments.map((appointment) => ({ id: appointment.id, startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString(), status: appointment.status, price: appointment.price, notes: appointment.notes, clientId: appointment.project.clientId, clientName: `${appointment.project.client.firstName} ${appointment.project.client.lastName}`, projectTitle: appointment.project.title }))} blocks={blocks.map((block) => ({ id: block.id, startsAt: block.startsAt.toISOString(), endsAt: block.endsAt.toISOString(), reason: block.reason }))} slots={slots.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), title: item.title, description: item.description, color: item.color, icon: item.icon, isPublic: item.isPublic }))} promotions={promotions.map((item) => ({ id: item.id, title: item.title, description: item.description, badge: item.badge, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), color: item.color, icon: item.icon, isPublic: item.isPublic, active: item.active }))} events={events.map((item) => ({ id: item.id, title: item.title, description: item.description, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), allDay: item.allDay, color: item.color, icon: item.icon, label: item.label, isPublic: item.isPublic, google: Boolean(item.googleCalendarSync), syncStatus: item.googleCalendarSync?.syncStatus ?? null }))} bufferMinutes={Number(setting.get("booking_buffer_minutes")) || 30} visibleMonths={Math.min(12, Math.max(1, Number(setting.get("calendar_visible_months")) || 3))} defaultFreeStart={setting.get("calendar_default_free_start") || "10:00"} defaultFreeEnd={setting.get("calendar_default_free_end") || "18:00"} />
  </div>;
}
