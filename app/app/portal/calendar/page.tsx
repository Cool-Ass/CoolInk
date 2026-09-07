import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";
import { getActiveTattooStyleLabels } from "@/lib/tattooStyles";
import ClientWaitlistCard from "@/components/client/ClientWaitlistCard";

export const dynamic = "force-dynamic";

export default async function PortalCalendarPage({ searchParams }: { searchParams: Promise<{ booking?: string; reschedule?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking, reschedule } = await searchParams;
  const [projects, calendar, tattooStyles, rescheduledAppointment, waitlistEntries] = await Promise.all([
    prisma.tattooProject.findMany({ where: { clientId: current.id, status: { not: "cancelled" } }, select: { id: true, title: true, kind: true, status: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    getPublicCalendarData(true),
    getActiveTattooStyleLabels(),
    reschedule ? prisma.appointment.findFirst({ where: { id: reschedule, project: { clientId: current.id }, status: { in: ["requested", "proposed", "confirmed"] } }, select: { id: true, project: { select: { kind: true, title: true } } } }) : Promise.resolve(null),
    prisma.waitlistEntry.findMany({ where: { clientId: current.id }, select: { id: true, projectId: true, status: true, durationMinutes: true, preferredWeekdays: true, timePreference: true, earliestDate: true, latestDate: true, notes: true, offerExpiresAt: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const tattooProjects = projects.filter((project) => project.kind === "tattoo" && !["completed", "cancelled"].includes(project.status)).map(({ id, title }) => ({ id, title }));
  return <div><p className="text-xs tracking-[.18em] text-ink-gold">KALENDARZ</p><h1 className="mt-2 font-display text-4xl">{rescheduledAppointment ? "Wybierz nowy termin" : "Wolne terminy"}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-grey">{rescheduledAppointment ? `Przekładasz: ${rescheduledAppointment.project.title}. Po wyborze studio potwierdzi zmianę.` : "Widoczne są tylko terminy, które studio oznaczyło jako wolne."}</p><ClientBookingCalendar {...calendar} projects={projects.map(({ id, title }) => ({ id, title }))} tattooStyles={tattooStyles} initialStartsAt={booking} rescheduleAppointmentId={rescheduledAppointment?.id} rescheduleServiceType={rescheduledAppointment?.project.kind === "consultation" ? "consultation" : rescheduledAppointment ? "tattoo" : undefined} />{!rescheduledAppointment && <ClientWaitlistCard projects={tattooProjects} entries={waitlistEntries.map((entry) => ({ ...entry, earliestDate: entry.earliestDate?.toISOString().slice(0, 10) ?? null, latestDate: entry.latestDate?.toISOString().slice(0, 10) ?? null, offerExpiresAt: entry.offerExpiresAt?.toISOString() ?? null }))} />}</div>;
}
