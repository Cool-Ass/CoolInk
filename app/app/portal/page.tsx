import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const nextCopy = primary ? CLIENT_STATUS[primary.status as keyof typeof CLIENT_STATUS]?.next ?? "Studio wróci z kolejnym krokiem." : "Wybierz termin lub opowiedz o swoim pomyśle.";

  return <div>
    <p className="text-xs tracking-[.18em] text-ink-gold">STREFA KLIENTA</p>
    <h1 className="mt-2 font-display text-4xl sm:text-6xl">Cześć, {client.firstName}.</h1>
    <section className="mt-7 border-l-4 border-ink-gold bg-ink-gold/5 p-5 sm:p-6">
      <p className="text-xs tracking-[.14em] text-ink-gold">TWÓJ NASTĘPNY KROK</p>
      {primary ? <><div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl sm:text-3xl">{primary.title}</h2>{primary.kind === "consultation" && <span className="border border-blue-400/50 px-2 py-1 text-xs text-blue-200">KONSULTACJA</span>}<StatusBadge status={primary.status} /></div><p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-grey">{nextCopy}</p><Link href="/app/portal/projects" className="mt-5 inline-block border border-ink-gold px-4 py-2.5 text-xs text-ink-gold hover:bg-ink-gold hover:text-ink-black">OTWÓRZ SZCZEGÓŁY →</Link></> : <><h2 className="mt-3 font-display text-3xl">Rozpocznij nowy projekt.</h2><p className="mt-3 text-base text-ink-grey">Wybierz udostępniony termin albo konsultację w kalendarzu.</p></>}
    </section>

    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {nextVisit && <Link href="/app/portal/projects" className="border border-blue-400/30 bg-blue-400/5 p-5 hover:border-blue-300"><p className="text-xs tracking-widest text-blue-200">NAJBLIŻSZY TERMIN</p><p className="mt-3 font-display text-2xl">{nextVisit.startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</p><p className="mt-2 text-sm text-ink-grey">{nextVisit.project.title}</p></Link>}
      <Link href="/app/portal/projects" className="border border-ink-white/15 bg-ink-charcoal/30 p-5 hover:border-ink-gold"><p className="text-xs tracking-widest text-ink-gold">PROJEKTY I KONSULTACJE</p><p className="mt-3 font-display text-3xl">{projects.length}</p><p className="mt-2 text-sm text-ink-grey">Historia, terminy, zdjęcia i aktualny status.</p></Link>
      <Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="border border-emerald-500/35 bg-emerald-500/5 p-5 hover:border-emerald-400"><p className="text-xs tracking-widest text-emerald-300">KALENDARZ</p><p className="mt-3 font-display text-3xl">Wolne terminy</p><p className="mt-2 text-sm text-ink-grey">Wizyta lub krótka konsultacja.</p></Link>
      <Link href="/app/portal/messages" className="border border-ink-white/15 bg-ink-charcoal/30 p-5 hover:border-ink-gold"><p className="text-xs tracking-widest text-ink-gold">WIADOMOŚCI</p><p className="mt-3 font-display text-2xl">Napisz do studia</p><p className="mt-2 text-sm text-ink-grey">Wszystkie rozmowy powiązane z Twoimi projektami.</p></Link>
    </div>
  </div>;
}
