import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { CalendarDays, Images, MessageCircle, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking } = await searchParams;
  const now = new Date();
  const [client, projects] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.tattooProject.findMany({
      where: { clientId: current.id, status: { not: "cancelled" } },
      select: { id: true, title: true, kind: true, status: true, updatedAt: true, appointments: { where: { startsAt: { gte: now }, status: { notIn: ["cancelled", "no_show"] } }, orderBy: { startsAt: "asc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  const primary = projects.find((project) => !["completed", "cancelled"].includes(project.status)) ?? projects[0];
  const nextVisit = projects.flatMap((project) => project.appointments.map((appointment) => ({ ...appointment, project }))).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
  const nextCopy = primary ? CLIENT_STATUS[primary.status as keyof typeof CLIENT_STATUS]?.next ?? "Studio wróci z kolejnym krokiem." : "";

  return <div className="studio-page">
    <header>
      <p className="studio-eyebrow">STREFA KLIENTA</p>
      <h1 className="studio-page-title">Cześć, {client.firstName}.</h1>
    </header>
    {nextVisit && <section className="studio-hero grid items-center gap-5 sm:grid-cols-[1fr_auto]">
      <div><p className="studio-eyebrow">TWOJA NAJBLIŻSZA WIZYTA</p><h2 className="mt-3 text-2xl font-semibold sm:text-3xl">{formatCoolinkDateTime(nextVisit.startsAt)}</h2><p className="mb-3 mt-2 text-sm text-ink-grey">{nextVisit.project.title}</p><StatusBadge status={nextVisit.status} /></div>
      <Link href="/app/portal/projects" className="studio-primary-link">Szczegóły wizyty <ArrowUpRight aria-hidden className="h-4 w-4" /></Link>
    </section>}
    {primary && <section className="studio-panel p-5">
      <p className="text-xs tracking-[.14em] text-ink-gold">TWÓJ NASTĘPNY KROK</p>
      <div className="mt-2 flex flex-wrap items-center gap-2"><h2 className="font-display text-xl sm:text-2xl">{primary.title}</h2>{primary.kind === "consultation" && <span className="border border-blue-400/50 px-2 py-1 text-[10px] text-blue-200">KONSULTACJA</span>}<StatusBadge status={primary.status} /></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-grey">{nextCopy}</p><Link href="/app/portal/projects" className="mt-3 inline-block border border-ink-gold px-3 py-2 text-[10px] text-ink-gold hover:bg-ink-gold hover:text-ink-black">OTWÓRZ SZCZEGÓŁY →</Link>
    </section>}

    {!primary && <section className="studio-hero"><p className="studio-eyebrow">TWÓJ POMYSŁ. TWOJA HISTORIA.</p><h2 className="mt-3 text-2xl font-semibold">Zacznij od wolnego terminu.</h2><p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-grey">Wybierz termin w kalendarzu, opisz swój pomysł i dodaj inspiracje. Szczegóły ustalimy razem.</p><Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="studio-primary-link mt-5">Sprawdź terminy <ArrowUpRight aria-hidden className="h-4 w-4" /></Link></section>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Link href="/app/portal/projects" className="studio-shortcut"><Images aria-hidden /><div><p className="text-sm font-medium">Twoje projekty · {projects.length}</p><p className="mt-1 text-xs text-ink-grey">Inspiracje, historia i szczegóły.</p></div></Link>
      <Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="studio-shortcut"><CalendarDays aria-hidden /><div><p className="text-sm font-medium">Wolne terminy</p><p className="mt-1 text-xs text-ink-grey">Umów wizytę lub konsultację.</p></div></Link>
      <Link href="/app/portal/messages" className="studio-shortcut"><MessageCircle aria-hidden /><div><p className="text-sm font-medium">Kontakt ze studiem</p><p className="mt-1 text-xs text-ink-grey">Ustalmy szczegóły Twojego pomysłu.</p></div></Link>
    </div>
  </div>;
}
