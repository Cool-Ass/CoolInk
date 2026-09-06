import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ModuleRenderer from "@/components/ModuleRenderer";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedPortfolioWorks } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { defaultHomepageModules, type Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";
import PublicBookingCalendar from "@/components/client/PublicBookingCalendar";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import { getMaintenanceMode } from "@/lib/maintenance";
import { getCurrentAdmin } from "@/lib/auth";

// Content is admin-editable, so this page must always read the current
// database state rather than being frozen at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const maintenanceEnabled = await getMaintenanceMode();
  if (!maintenanceEnabled || (await getCurrentAdmin())) return {};

  return {
    title: "Zapraszam wkrótce | CoolInk Tattoo Studio",
    description: "CoolInk Tattoo Studio — strona jest właśnie dopracowywana.",
    robots: { index: false, follow: false },
  };
}

export default async function Home() {
  const maintenanceEnabled = await getMaintenanceMode();
  const admin = maintenanceEnabled ? await getCurrentAdmin() : null;
  if (maintenanceEnabled && !admin) return <MaintenanceScreen />;

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
      {maintenanceEnabled && admin && (
        <aside className="fixed bottom-4 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col gap-3 border border-amber-400/50 bg-ink-black/95 px-4 py-3 text-ink-white shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between" aria-label="Tryb budowy">
          <p className="text-[13px] leading-relaxed text-amber-100">
            <strong className="tracking-[0.08em] text-amber-300">TRYB BUDOWY AKTYWNY</strong>
            <span className="block text-ink-grey">Klienci widzą ekran „Zapraszam wkrótce”.</span>
          </p>
          <Link href={homepage ? `/admin/pages/${homepage.id}` : "/admin/pages"} className="shrink-0 border border-ink-gold px-4 py-2.5 text-center text-[12px] tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold">
            EDYTUJ STRONĘ
          </Link>
        </aside>
      )}
      <Header navLinks={navLinks} bookLabel={bookLabel} logoUrl={content.brand.logoUrl} />
      <ModuleRenderer
        modules={modules}
        portfolioWorks={works}
        globals={{
          instagramUrl: content.brand.instagramUrl,
          facebookUrl: content.brand.facebookUrl,
          contact: content.contact,
        }}
      />
      <section id="kalendarz" className="bg-ink-black px-4 py-16 text-ink-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl"><p className="text-[11px] tracking-[.2em] text-ink-gold">UMÓW WIZYTĘ</p><h2 className="mt-3 font-display text-4xl sm:text-6xl">Sprawdź wolne terminy.</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-grey">Wybierz zielony termin. Po zalogowaniu wrócimy dokładnie do wybranej daty, aby dokończyć prośbę o wizytę.</p><PublicBookingCalendar {...calendar} /></div>
      </section>
      <Footer navLinks={navLinks} text={content.footer.text} logoUrl={content.brand.logoUrl} />
    </main>
  );
}
