import { clientNextAction } from "@/lib/clientNextAction";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { CalendarDays, Images, MessageCircle, ArrowUpRight } from "lucide-react";
import LoyaltyCard from "@/components/client/LoyaltyCard";
import ClientAnnouncements from "@/components/client/ClientAnnouncements";
import { getClientAnnouncements } from "@/lib/announcements";
import { getLoyaltyCard } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking } = await searchParams;
  const now = new Date();
  const [client, projects, nextVisit, documents] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.tattooProject.findMany({
      where: { clientId: current.id, clientArchivedAt: null, status: { not: "cancelled" } },
      select: { id: true, title: true, kind: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.appointment.findFirst({ where: { project: { clientId: current.id, clientArchivedAt: null, status: { notIn: ["cancelled", "completed"] } }, endsAt: { gte: now }, status: { in: ["requested", "proposed", "confirmed"] }, NOT: { status: "proposed", waitlistOffer: { is: { offerExpiresAt: { lte: now } } } } }, include: { project: { select: { id: true, title: true, status: true } } }, orderBy: { startsAt: "asc" } }),
    prisma.studioDocument.findMany({ where: { published: true, category: "consent" }, select: { version: true, acceptances: { where: { clientId: current.id }, select: { version: true } } } }),
  ]);
  const primary = projects.find(project => project.id === nextVisit?.project.id) ?? projects.find(project => project.status === "awaiting_client") ?? projects.find(project => !["completed", "cancelled"].includes(project.status)) ?? projects[0];
  const missingConsents = documents.filter(doc => !doc.acceptances.some(a => a.version === doc.version)).length;
  const focusProject = nextVisit?.project ?? primary;
  const action = clientNextAction(focusProject?.status, nextVisit?.status, missingConsents);
  const projectHref = `/app/portal/projects?project=${focusProject?.id ?? ""}`;
  const visitHref = nextVisit ? `/app/portal/projects?project=${nextVisit.project.id}&appointment=${nextVisit.id}` : projectHref;
  const loyalty = await getLoyaltyCard(current.id);
  const announcements = await getClientAnnouncements(current.id);

  return <div className="studio-page">
    <header>
      <p className="studio-eyebrow">STREFA KLIENTA</p>
      <h1 className="studio-page-title">Cześć, {client.firstName}.</h1>
    </header>
    {nextVisit && <section className="studio-hero grid items-center gap-5 sm:grid-cols-[1fr_auto]">
      <div><p className="studio-eyebrow">TWOJA NAJBLIŻSZA WIZYTA</p><h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCoolinkDateTime(nextVisit.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</h2><p className="mb-3 mt-2 text-sm text-ink-grey">{nextVisit.project.title}</p><StatusBadge status={nextVisit.status} /></div>
      <Link href={`/app/portal/projects?project=${nextVisit.project.id}&appointment=${nextVisit.id}`} className="studio-primary-link">Szczegóły wizyty <ArrowUpRight aria-hidden className="h-4 w-4" /></Link>
    </section>}
    {action && <section aria-label="Twój następny krok" className="studio-panel flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">{action.label}</h2>{focusProject && <p className="mt-1 text-sm text-ink-grey">{focusProject.title}</p>}</div><Link className="studio-primary-link" href={action.destination === "documents" ? "/app/portal/documents" : action.destination === "visit" ? visitHref : projectHref}>{action.destination === "documents" ? "Otwórz formularze" : action.destination === "visit" ? "Sprawdź propozycję" : "Otwórz tatuaż"} <ArrowUpRight aria-hidden className="h-4 w-4" /></Link></section>}
    {nextVisit?.status === "requested" && <p role="status" className="text-sm text-ink-grey">Twoje zgłoszenie czeka na odpowiedź studia. Proponowany termin nie jest jeszcze potwierdzony.</p>}
    {announcements.length > 0 && <ClientAnnouncements initial={announcements} />}

    {!focusProject && <section className="studio-hero"><p className="studio-eyebrow">TWÓJ POMYSŁ. TWOJA HISTORIA.</p><h2 className="mt-3 text-2xl font-semibold">Zacznij od wolnego terminu.</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-grey">Wybierz termin w kalendarzu, opisz swój pomysł i dodaj inspiracje. Szczegóły ustalimy razem.</p><Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="studio-primary-link mt-5">Sprawdź terminy <ArrowUpRight aria-hidden className="h-4 w-4" /></Link></section>}
    <LoyaltyCard card={loyalty} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Link href="/app/portal/projects" className="studio-shortcut"><Images aria-hidden /><div><p className="text-sm font-medium">Twoje tatuaże · {projects.length}</p><p className="mt-1 text-xs text-ink-grey">Inspiracje, historia i szczegóły.</p></div></Link>
      <Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="studio-shortcut"><CalendarDays aria-hidden /><div><p className="text-sm font-medium">Wolne terminy</p><p className="mt-1 text-xs text-ink-grey">Umów wizytę lub konsultację.</p></div></Link>
      <Link href="/app/portal/messages" className="studio-shortcut"><MessageCircle aria-hidden /><div><p className="text-sm font-medium">Kontakt ze studiem</p><p className="mt-1 text-xs text-ink-grey">Ustalmy szczegóły Twojego pomysłu.</p></div></Link>
    </div>
  </div>;
}
