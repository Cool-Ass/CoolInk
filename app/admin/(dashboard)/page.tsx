import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStats() {
  const [pageCount, publishedPages, portfolioCount, publishedPortfolio, mediaCount, clientCount, openProjects] =
    await Promise.all([
      prisma.page.count({ where: { isHomepage: false } }),
      prisma.page.count({ where: { status: "published" } }),
      prisma.portfolioItem.count(),
      prisma.portfolioItem.count({ where: { published: true } }),
      prisma.media.count(),
      prisma.client.count(),
      prisma.tattooProject.count({ where: { status: { in: ["inquiry", "reviewing", "accepted", "scheduled"] } } }),
    ]);
  return { pageCount, publishedPages, portfolioCount, publishedPortfolio, mediaCount, clientCount, openProjects };
}

const QUICK_LINKS = [
  { href: "/admin/pages/new", label: "Utwórz nową stronę" },
  { href: "/admin/portfolio", label: "Dodaj zdjęcie do portfolio" },
  { href: "/admin/content", label: "Edytuj markę i dane kontaktowe" },
  { href: "/admin/navigation", label: "Zarządzaj nawigacją" },
  { href: "/admin/clients", label: "Otwórz CRM klientów" },
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
