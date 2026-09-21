import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";
import { getActiveTattooStyleLabels } from "@/lib/tattooStyles";
import ClientWaitlistCard from "@/components/client/ClientWaitlistCard";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

export default async function PortalCalendarPage({ searchParams }: { searchParams: Promise<{ booking?: string; reschedule?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking, reschedule } = await searchParams;
  const [projects, calendar, tattooStyles, rescheduledAppointment, waitlistEntries, consents, content] = await Promise.all([
    prisma.tattooProject.findMany({ where: { clientId: current.id, status: { not: "cancelled" } }, select: { id: true, title: true, kind: true, status: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    getPublicCalendarData(true),
    getActiveTattooStyleLabels(),
    reschedule ? prisma.appointment.findFirst({ where: { id: reschedule, project: { clientId: current.id }, status: { in: ["requested", "proposed", "confirmed"] } }, select: { id: true, project: { select: { kind: true, title: true } } } }) : Promise.resolve(null),
    prisma.waitlistEntry.findMany({ where: { clientId: current.id }, select: { id: true, projectId: true, status: true, durationMinutes: true, preferredWeekdays: true, timePreference: true, earliestDate: true, latestDate: true, notes: true, offerExpiresAt: true }, orderBy: { updatedAt: "desc" } }),
    prisma.studioDocument.findMany({ where: { published: true, category: "consent" }, select: { id: true, title: true, version: true, content: true, formFields: true, acceptances: { where: { clientId: current.id }, select: { version: true, answers: true } } }, orderBy: { title: "asc" } }),
    getSiteContent(),
  ]);
  const navLinks = await getPublicNavLinks(content.navigation);
  const formModules = await getPublishedSystemModules("bookingForm", content, navLinks);
  const tattooProjects = projects.filter((project) => project.kind === "tattoo" && !["completed", "cancelled"].includes(project.status)).map(({ id, title }) => ({ id, title }));
  return <div><header><p className="studio-eyebrow">KALENDARZ</p><h1 className="studio-page-title">{rescheduledAppointment ? "Wybierz nowy termin" : "Wolne terminy"}</h1><p className="studio-page-description">{rescheduledAppointment ? `Przekładasz: ${rescheduledAppointment.project.title}. Po wyborze studio potwierdzi zmianę.` : "Zielone dni zawierają możliwy do wybrania termin lub konsultację. Kliknij dzień, aby zobaczyć dostępne godziny."}</p></header><ClientBookingCalendar {...calendar} projects={projects.map(({ id, title }) => ({ id, title }))} tattooStyles={tattooStyles} initialStartsAt={booking} rescheduleAppointmentId={rescheduledAppointment?.id} rescheduleServiceType={rescheduledAppointment?.project.kind === "consultation" ? "consultation" : rescheduledAppointment ? "tattoo" : undefined} consents={consents.map(({ acceptances, ...document }) => ({ ...document, answers: JSON.parse(acceptances.find((item) => item.version === document.version)?.answers ?? "{}"), accepted: acceptances.some((item) => item.version === document.version) }))} formIntro={<ModuleRenderer modules={formModules} globals={{ theme: content.theme, instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl, contact: content.contact }} />} />{!rescheduledAppointment && <ClientWaitlistCard projects={tattooProjects} entries={waitlistEntries.map((entry) => ({ ...entry, earliestDate: entry.earliestDate?.toISOString().slice(0, 10) ?? null, latestDate: entry.latestDate?.toISOString().slice(0, 10) ?? null, offerExpiresAt: entry.offerExpiresAt?.toISOString() ?? null }))} />}</div>;
}
