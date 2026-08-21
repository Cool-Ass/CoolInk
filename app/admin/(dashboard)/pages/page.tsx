import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageRowActions from "@/components/admin/PageRowActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Wersja robocza",
  published: "Opublikowana",
  unpublished: "Cofnięto publikację",
};

export default async function PagesListPage() {
  const pages = await prisma.page.findMany({
    orderBy: [{ isHomepage: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-[13px] font-medium tracking-[0.3em] text-ink-gold">STRONY</p>
          <h1 className="font-display text-3xl text-ink-white">Zarządzaj stronami</h1>
        </div>
        <Link
          href="/admin/pages/new"
          className="inline-flex items-center gap-2 border border-ink-gold px-5 py-3 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black"
        >
          + NOWA STRONA
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="border border-dashed border-ink-white/15 px-6 py-10 text-center text-[14px] text-ink-grey">
          Brak stron. Utwórz pierwszą — O nas, FAQ, Cennik, Pielęgnacja…
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-ink-white/10 border border-ink-white/10">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="truncate text-[15px] text-ink-white">{page.title}</p>
                  {page.isHomepage && (
                    <span className="shrink-0 border border-ink-gold/50 px-2 py-0.5 text-[10px] tracking-[0.1em] text-ink-gold">
                      STRONA GŁÓWNA
                    </span>
                  )}
                  <span
                    className={`shrink-0 border px-2 py-0.5 text-[10px] tracking-[0.1em] ${
                      page.status === "published"
                        ? "border-ink-gold/50 text-ink-gold"
                        : "border-ink-grey/40 text-ink-grey"
                    }`}
                  >
                    {(STATUS_LABELS[page.status] ?? page.status).toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-grey">
                  {page.isHomepage ? "/" : `/${page.slug}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-5">
                <Link
                  href={`/admin/pages/${page.id}`}
                  className="text-[12px] tracking-[0.05em] text-ink-white transition-colors hover:text-ink-gold"
                >
                  EDYTUJ
                </Link>
                <PageRowActions id={page.id} isHomepage={page.isHomepage} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
