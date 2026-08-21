import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedPortfolioWorks } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { defaultHomepageModules, type Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";

// Content is admin-editable, so this page must always read the current
// database state rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [homepage, content, navLinks, works] = await Promise.all([
    prisma.page.findFirst({ where: { isHomepage: true } }),
    getSiteContent(),
    getPublicNavLinks(),
    getPublishedPortfolioWorks(),
  ]);

  const modules: Module[] =
    homepage && homepage.status === "published" && homepage.publishedModules
      ? parseModules(homepage.publishedModules)
      : defaultHomepageModules();

  const heroModule = modules.find((m) => m.type === "hero");
  const bookLabel = (heroModule?.data?.primaryBtnLabel as string) || "UMÓW WIZYTĘ";

  return (
    <main className="relative">
      <Header navLinks={navLinks} bookLabel={bookLabel} logoUrl={content.brand.logoUrl} />
      <ModuleRenderer
        modules={modules}
        portfolioWorks={works}
        globals={{
          instagramUrl: content.brand.instagramUrl,
          facebookUrl: content.brand.facebookUrl,
        }}
      />
      <Footer navLinks={navLinks} text={content.footer.text} logoUrl={content.brand.logoUrl} />
    </main>
  );
}
