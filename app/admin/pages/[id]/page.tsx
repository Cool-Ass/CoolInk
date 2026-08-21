import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteContent } from "@/lib/content";
import { getAllPortfolioWorks } from "@/lib/portfolio";
import { ToastProvider } from "@/components/admin/ToastProvider";
import PageBuilder from "@/components/admin/builder/PageBuilder";
import type { Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PageBuilderRoute({ params }: Props) {
  const { id } = await params;

  const [page, works, content] = await Promise.all([
    prisma.page.findUnique({ where: { id } }),
    getAllPortfolioWorks(),
    getSiteContent(),
  ]);

  if (!page) notFound();

  return (
    <ToastProvider>
      <PageBuilder
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          excerpt: page.excerpt,
          coverImage: page.coverImage,
          modules: parseModules(page.modules),
          status: page.status,
          isHomepage: page.isHomepage,
          showInNav: page.showInNav,
          navOrder: page.navOrder,
        }}
        portfolioItems={works}
        globals={{
          instagramUrl: content.brand.instagramUrl,
          facebookUrl: content.brand.facebookUrl,
        }}
      />
    </ToastProvider>
  );
}
