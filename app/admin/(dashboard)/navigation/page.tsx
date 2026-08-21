import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NavItemManager from "@/components/admin/NavItemManager";
import type { Page } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "ROBOCZA",
  published: "OPUBLIKOWANA",
  unpublished: "COFNIĘTO PUBLIKACJĘ",
};

export default async function NavigationPage() {
  const [pages, navItems] = await Promise.all([
    prisma.page.findMany({
      where: { isHomepage: false },
      orderBy: { navOrder: "asc" },
    }),
    prisma.navItem.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">NAWIGACJA</p>
        <h1 className="font-display text-3xl text-ink-white">Zarządzaj menu</h1>
        <p className="mt-2 max-w-xl text-[13px] text-ink-grey">
          Podstawowe sekcje (Strona główna, O mnie, Portfolio, Studio, Kontakt) są zawsze w menu.
          Poniżej możesz kontrolować, które strony CMS też się w nim pojawiają, oraz dodać własne
          linki.
        </p>
      </div>

      <div>
        <p className="mb-4 text-[12px] tracking-[0.15em] text-ink-grey">STRONY</p>
        {pages.length === 0 ? (
          <p className="border border-dashed border-ink-white/15 px-6 py-8 text-center text-[13px] text-ink-grey">
            Brak stron. Utwórz jedną w zakładce Strony, a następnie ustaw jej widoczność w menu w
            ustawieniach strony (&quot;Pokaż w menu nawigacji&quot;).
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-ink-white/10 border border-ink-white/10">
            {pages.map((page: Page) => (
              <div key={page.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ink-white">{page.title}</p>
                  <p className="truncate text-[11px] text-ink-grey">/{page.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-[11px]">
                  <span
                    className={
                      page.status === "published" ? "text-ink-gold" : "text-ink-grey"
                    }
                  >
                    {STATUS_LABELS[page.status] ?? page.status.toUpperCase()}
                  </span>
                  <span className={page.showInNav ? "text-ink-gold" : "text-ink-grey"}>
                    {page.showInNav ? "W MENU" : "UKRYTA"}
                  </span>
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="text-ink-white transition-colors hover:text-ink-gold"
                  >
                    EDYTUJ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-4 text-[12px] tracking-[0.15em] text-ink-grey">WŁASNE LINKI</p>
        <NavItemManager initialItems={navItems} />
      </div>
    </div>
  );
}
