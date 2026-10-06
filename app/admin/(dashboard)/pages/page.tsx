import Link from "next/link";
import WorkspaceHeader from "@/components/ui/WorkspaceHeader";
import { prisma } from "@/lib/prisma";
import PageRowActions from "@/components/admin/PageRowActions";
import MaintenanceModeCard from "@/components/admin/MaintenanceModeCard";
import { getMaintenanceMode } from "@/lib/maintenance";
import { ensureEditableHomepage } from "@/lib/homepage";
import { requireAdminPage } from "@/lib/adminPage";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { ensureSystemPages, isSystemPageSlug } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Wersja robocza",
  published: "Opublikowana",
  unpublished: "Cofnięto publikację",
};

export default async function PagesListPage() {
  await requireAdminPage("content.manage");
  const [homepage, maintenanceEnabled, content] = await Promise.all([
    ensureEditableHomepage(),
    getMaintenanceMode(),
    getSiteContent(),
  ]);
  const navLinks = await getPublicNavLinks(content.navigation);
  const systemPages = await ensureSystemPages(content, navLinks);
  const pages = (await prisma.page.findMany({
    orderBy: [{ isHomepage: "desc" }, { updatedAt: "desc" }],
  })).filter((page) => !isSystemPageSlug(page.slug));

  return (
    <div className="studio-page">
      <WorkspaceHeader eyebrow="STRONA / CMS" title="Strony i builder" description="Strony publiczne i ekrany systemowe w jednym miejscu."
        actions={<Link href="/admin/pages/new" className="studio-primary-link">+ Nowa strona</Link>} />

      <MaintenanceModeCard initialEnabled={maintenanceEnabled} homepageId={homepage.id} />

      <section>
        <div className="mb-3"><p className="studio-eyebrow">EKRANY SYSTEMOWE</p><h2 className="mt-1 text-base font-semibold">Edytuj bezpośrednio w builderze</h2><p className="studio-page-description">Treści i oprawę ekranów możesz zmieniać wizualnie. Własny HTML i CSS działa w odizolowanej ramce; pola logowania i wysyłania danych pozostają chronione.</p></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{systemPages.map((page) => <Link key={page.id} href={`/admin/pages/${page.id}`} className="studio-panel min-w-0 transition-colors hover:border-ink-gold focus-visible:outline-2 focus-visible:outline-ink-gold"><div className="flex items-center justify-between gap-3"><p className="min-w-0 text-sm font-medium">{page.title}</p><span aria-hidden className="shrink-0 text-ink-gold">→</span></div><p className="mt-2 text-[10px] tracking-[.1em] text-ink-grey">SYSTEMOWY · {page.status === "published" ? "OPUBLIKOWANY" : "WERSJA ROBOCZA"}</p></Link>)}</div>
      </section>

      {pages.length === 0 ? (
        <p className="studio-panel py-8 text-center text-sm text-ink-grey">
          Brak stron. Utwórz pierwszą — O nas, FAQ, Cennik, Pielęgnacja…
        </p>
      ) : (
        <div className="studio-panel p-0 flex flex-col divide-y divide-ink-white/10">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[15px] text-ink-white">{page.title}</p>
                  {page.isHomepage && (
                    <span className="shrink-0 rounded-full border border-ink-gold/50 px-2 py-0.5 text-[10px] tracking-[0.1em] text-ink-gold">
                      STRONA GŁÓWNA
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] tracking-[0.1em] ${
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
