import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { CLIENT_STATUS } from "@/lib/projectWorkflow";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCoolinkDateTime } from "@/lib/dateTime";

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
    {primary && <section className="border-l-2 border-ink-gold bg-ink-gold/5 p-4">
      <p className="text-xs tracking-[.14em] text-ink-gold">TWÓJ NASTĘPNY KROK</p>
      <div className="mt-2 flex flex-wrap items-center gap-2"><h2 className="font-display text-xl sm:text-2xl">{primary.title}</h2>{primary.kind === "consultation" && <span className="border border-blue-400/50 px-2 py-1 text-[10px] text-blue-200">KONSULTACJA</span>}<StatusBadge status={primary.status} /></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-grey">{nextCopy}</p><Link href="/app/portal/projects" className="mt-3 inline-block border border-ink-gold px-3 py-2 text-[10px] text-ink-gold hover:bg-ink-gold hover:text-ink-black">OTWÓRZ SZCZEGÓŁY →</Link>
    </section>}

    {!primary && <p className="border-l-2 border-ink-gold/60 pl-3 text-sm leading-relaxed text-ink-grey">Wybierz wolny termin w kalendarzu. Utworzysz i opiszesz nowy projekt albo dodasz wizytę do istniejącego.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {nextVisit && <Link href="/app/portal/projects" className="border border-blue-400/30 bg-blue-400/5 p-4 hover:border-blue-300"><p className="text-[10px] tracking-widest text-blue-200">NAJBLIŻSZY TERMIN</p><p className="mt-2 font-display text-xl">{formatCoolinkDateTime(nextVisit.startsAt)}</p><p className="mt-1 text-xs text-ink-grey">{nextVisit.project.title}</p></Link>}
      <Link href="/app/portal/projects" className="border border-ink-white/15 bg-ink-charcoal/30 p-4 hover:border-ink-gold"><p className="text-[10px] tracking-widest text-ink-gold">PROJEKTY I KONSULTACJE</p><p className="mt-2 font-display text-2xl">{projects.length}</p><p className="mt-1 text-xs text-ink-grey">Historia, terminy, zdjęcia i status.</p></Link>
      <Link href={`/app/portal/calendar${booking ? `?booking=${encodeURIComponent(booking)}` : ""}`} className="border border-emerald-500/35 bg-emerald-500/5 p-4 hover:border-emerald-400"><p className="text-[10px] tracking-widest text-emerald-300">KALENDARZ</p><p className="mt-2 font-display text-2xl">Wolne terminy</p><p className="mt-1 text-xs text-ink-grey">Wizyta lub konsultacja.</p></Link>
    </div>
  </div>;
}
