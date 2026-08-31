import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedPortfolioWorks } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { defaultHomepageModules, type Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";
import PublicBookingCalendar from "@/components/client/PublicBookingCalendar";
import { getPublicCalendarData } from "@/lib/publicCalendar";

// Content is admin-editable, so this page must always read the current
// database state rather than being frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [homepage, content, navLinks, works, calendar] = await Promise.all([
    prisma.page.findFirst({ where: { isHomepage: true } }),
    getSiteContent(),
    getPublicNavLinks(),
    getPublishedPortfolioWorks(),
    getPublicCalendarData(),
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
      <section id="kalendarz" className="bg-ink-black px-4 py-16 text-ink-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl"><p className="text-[11px] tracking-[.2em] text-ink-gold">UMÓW WIZYTĘ</p><h2 className="mt-3 font-display text-4xl sm:text-6xl">Sprawdź wolne terminy.</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-grey">Wybierz zielony termin. Po zalogowaniu wrócimy dokładnie do wybranej daty, aby dokończyć prośbę o wizytę.</p><PublicBookingCalendar {...calendar} /></div>
      </section>
      <Footer navLinks={navLinks} text={content.footer.text} logoUrl={content.brand.logoUrl} />
    </main>
  );
}
