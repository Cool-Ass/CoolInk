import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const [pageCount, publishedPages, portfolioCount, publishedPortfolio, mediaCount, clientCount, openProjects, unreadMessages, upcomingAppointments, pendingProjects, pendingDocuments] =
    await Promise.all([
      prisma.page.count({ where: { isHomepage: false } }),
      prisma.page.count({ where: { status: "published" } }),
      prisma.portfolioItem.count(),
      prisma.portfolioItem.count({ where: { published: true } }),
      prisma.media.count(),
      prisma.client.count(),
      prisma.tattooProject.count({ where: { status: { in: ["inquiry", "reviewing", "accepted", "scheduled"] } } }),
      prisma.contactMessage.count({ where: { isRead: false } }),
      prisma.appointment.findMany({
        where: { startsAt: { gte: now, lte: inSevenDays }, status: { notIn: ["cancelled", "no_show", "completed"] } },
        include: { project: { include: { client: true } } },
        orderBy: { startsAt: "asc" },
        take: 4,
      }),
      prisma.tattooProject.count({ where: { status: { in: ["inquiry", "reviewing"] } } }),
      prisma.documentAcceptance.count(),
    ]);
  return { pageCount, publishedPages, portfolioCount, publishedPortfolio, mediaCount, clientCount, openProjects, unreadMessages, upcomingAppointments, pendingProjects, pendingDocuments };
}

const QUICK_LINKS = [
  { href: "/admin/pages/new", label: "Utwórz nową stronę" },
  { href: "/admin/portfolio", label: "Dodaj zdjęcie do portfolio" },
  { href: "/admin/content", label: "Edytuj markę i dane kontaktowe" },
  { href: "/admin/navigation", label: "Zarządzaj nawigacją" },
  { href: "/admin/clients", label: "Otwórz CRM klientów" },
  { href: "/admin/calendar", label: "Otwórz kalendarz i dostępność" },
];

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: "Strony", value: stats.pageCount, sub: `${stats.publishedPages} opublikowanych` },
    {
      label: "Elementy portfolio",
      value: stats.portfolioCount,
      sub: `${stats.publishedPortfolio} opublikowanych`,
    },
    { label: "Pliki w bibliotece", value: stats.mediaCount, sub: "mediów" },
    { label: "Klienci", value: stats.clientCount, sub: "w bazie CRM" },
    { label: "Aktywne projekty", value: stats.openProjects, sub: "w realizacji" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
          PANEL GŁÓWNY
        </p>
        <h1 className="font-display text-3xl text-ink-white md:text-4xl">
          Witaj z powrotem.
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="border border-ink-white/10 bg-ink-charcoal/40 p-6">
            <p className="text-[12px] tracking-[0.15em] text-ink-grey">{card.label}</p>
            <p className="mt-3 font-display text-4xl text-ink-white">{card.value}</p>
            <p className="mt-1 text-[12px] text-ink-grey">{card.sub}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="border border-ink-white/10 bg-ink-charcoal/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] tracking-[0.15em] text-ink-grey">NAJBLIŻSZE WIZYTY</p>
              <h2 className="mt-2 font-display text-2xl text-ink-white">Ten tydzień</h2>
            </div>
            <Link href="/admin/calendar" className="text-xs tracking-[0.08em] text-ink-gold hover:text-ink-white">KALENDARZ →</Link>
          </div>
          <div className="mt-5 divide-y divide-ink-white/10">
            {stats.upcomingAppointments.length === 0 ? (
              <p className="py-5 text-sm text-ink-grey">Brak wizyt w najbliższych 7 dniach.</p>
            ) : stats.upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm text-ink-white">{appointment.project.client.firstName} {appointment.project.client.lastName}</p>
                  <p className="mt-1 text-xs text-ink-grey">{appointment.project.title}</p>
                </div>
                <time className="text-right text-xs text-ink-gold">
                  {appointment.startsAt.toLocaleString("pl-PL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-ink-white/10 bg-ink-charcoal/40 p-6">
          <p className="text-[12px] tracking-[0.15em] text-ink-grey">WYMAGA UWAGI</p>
          <h2 className="mt-2 font-display text-2xl text-ink-white">Powiadomienia</h2>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/admin/messages" className="flex items-center justify-between border border-ink-white/10 px-4 py-3 text-sm hover:border-ink-gold">
              <span>Nowe wiadomości</span><strong className="text-ink-gold">{stats.unreadMessages}</strong>
            </Link>
            <Link href="/admin/clients" className="flex items-center justify-between border border-ink-white/10 px-4 py-3 text-sm hover:border-ink-gold">
              <span>Oczekujące zgłoszenia</span><strong className="text-ink-gold">{stats.pendingProjects}</strong>
            </Link>
            <Link href="/admin/documents" className="flex items-center justify-between border border-ink-white/10 px-4 py-3 text-sm hover:border-ink-gold">
              <span>Potwierdzenia dokumentów</span><strong className="text-ink-gold">{stats.pendingDocuments}</strong>
            </Link>
          </div>
        </div>
      </section>

      <div>
        <p className="mb-4 text-[12px] tracking-[0.15em] text-ink-grey">SZYBKIE AKCJE</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between border border-ink-white/15 px-5 py-4 text-[14px] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold"
            >
              {link.label}
              <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
