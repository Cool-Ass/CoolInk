import { prisma } from "@/lib/prisma";
import NewAppointmentForm from "@/components/admin/NewAppointmentForm";
import AdminCalendar from "@/components/admin/AdminCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  const [appointments, projects, blocks, workingHours, clients] = await Promise.all([
    prisma.appointment.findMany({ include: { project: { include: { client: true } } }, where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.tattooProject.findMany({ where: { status: { in: ["inquiry", "reviewing", "accepted", "scheduled"] } }, include: { client: true }, orderBy: { updatedAt: "desc" } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: from } }, orderBy: { startsAt: "asc" } }),
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.client.findMany({ include: { projects: { select: { id: true, title: true }, orderBy: { updatedAt: "desc" } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);

  return <div className="flex flex-col gap-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[11px] tracking-[0.16em] text-ink-gold">WIZYTY I DOSTĘPNOŚĆ</p><h1 className="mt-2 font-display text-3xl text-ink-white">Kalendarz wizyt</h1><p className="mt-2 max-w-2xl text-sm text-ink-grey">Dane klientów widzisz tylko Ty. Klient zobaczy wyłącznie bezpieczny widok dostępności.</p></div><NewAppointmentForm projects={projects} /></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="border border-ink-white/10 p-4"><p className="text-[11px] tracking-[0.12em] text-ink-grey">ZAPLANOWANE WIZYTY</p><p className="mt-2 font-display text-3xl text-ink-white">{appointments.length}</p></div><div className="border border-ink-white/10 p-4"><p className="text-[11px] tracking-[0.12em] text-ink-grey">WYŁĄCZONE TERMINY</p><p className="mt-2 font-display text-3xl text-ink-white">{blocks.length}</p></div><div className="border border-ink-white/10 p-4"><p className="text-[11px] tracking-[0.12em] text-ink-grey">NOWE ZGŁOSZENIA</p><p className="mt-2 font-display text-3xl text-ink-white">{projects.filter((project) => ["inquiry", "reviewing"].includes(project.status)).length}</p></div></div>
    <AdminCalendar appointments={appointments.map((appointment) => ({ id: appointment.id, startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString(), status: appointment.status, notes: appointment.notes, clientName: `${appointment.project.client.firstName} ${appointment.project.client.lastName}`, projectTitle: appointment.project.title }))} blocks={blocks.map((block) => ({ id: block.id, startsAt: block.startsAt.toISOString(), endsAt: block.endsAt.toISOString(), reason: block.reason }))} workingHours={workingHours.map((item) => ({ weekday: item.weekday, enabled: item.enabled, startsAt: item.startsAt, endsAt: item.endsAt }))} clients={clients.map((client) => ({ id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email, projects: client.projects }))} />
  </div>;
}
