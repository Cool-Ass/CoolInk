import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteContent } from "@/lib/content";
import { getAllPortfolioWorks } from "@/lib/portfolio";
import { ToastProvider } from "@/components/admin/ToastProvider";
import PageBuilder from "@/components/admin/builder/PageBuilder";
import type { Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import { ensureEditableHomepage } from "@/lib/homepage";
import { requireAdminPage } from "@/lib/adminPage";
import { getPublicNavLinks } from "@/lib/nav";
import { ensureSystemPages, isSystemPageSlug } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PageBuilderRoute({ params }: Props) {
  await requireAdminPage("content.manage");
  const { id } = await params;

  const [page, works, content, calendar] = await Promise.all([
    prisma.page.findUnique({ where: { id } }),
    getAllPortfolioWorks(),
    getSiteContent(),
    getPublicCalendarData(),
  ]);

  if (!page) notFound();
  let editablePage = page.isHomepage ? await ensureEditableHomepage() : page;
  if (isSystemPageSlug(page.slug)) {
    const navLinks = await getPublicNavLinks(content.navigation);
    const systemPages = await ensureSystemPages(content, navLinks);
    editablePage = systemPages.find((item) => item.id === page.id) ?? editablePage;
  }

  return (
    <ToastProvider>
      <PageBuilder
        page={{
          id: editablePage.id,
          title: editablePage.title,
          slug: editablePage.slug,
          excerpt: editablePage.excerpt,
          coverImage: editablePage.coverImage,
          modules: parseModules(editablePage.modules),
          status: editablePage.status,
          isHomepage: editablePage.isHomepage,
          showInNav: editablePage.showInNav,
          navOrder: editablePage.navOrder,
        }}
        portfolioItems={works}
        globals={{
          instagramUrl: content.brand.instagramUrl,
          facebookUrl: content.brand.facebookUrl,
          contact: content.contact,
          calendar,
          theme: content.theme,
        }}
      />
    </ToastProvider>
  );
}
