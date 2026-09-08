import type { Metadata } from "next";
import Link from "next/link";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedPortfolioWorks } from "@/lib/portfolio";
import { defaultHomepageModules, type Module } from "@/lib/modules";
import { parseModules } from "@/lib/pageModules";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import { getMaintenanceMode } from "@/lib/maintenance";
import { getCurrentAdmin } from "@/lib/auth";
import { ensureEditableHomepage } from "@/lib/homepage";
import { siteThemeStyle } from "@/lib/siteTheme";
import { getPublishedSystemModules } from "@/lib/systemPages";

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
  if (maintenanceEnabled && !admin) {
    const content = await getSiteContent();
    const navLinks = await getPublicNavLinks(content.navigation);
    const maintenanceModules = await getPublishedSystemModules("maintenance", content, navLinks);
    return <ModuleRenderer modules={maintenanceModules} globals={{ theme: content.theme }} />;
  }

  const [homepage, content, works, calendar] = await Promise.all([
    ensureEditableHomepage(),
    getSiteContent(),
    getPublishedPortfolioWorks(),
    getPublicCalendarData(),
  ]);
  const navLinks = await getPublicNavLinks(content.navigation);
  const [headerModules, footerModules] = await Promise.all([getPublishedSystemModules("header", content, navLinks), getPublishedSystemModules("footer", content, navLinks)]);

  const modules: Module[] =
    homepage && homepage.status === "published" && homepage.publishedModules
      ? parseModules(homepage.publishedModules)
      : defaultHomepageModules();

  return (
    <main style={siteThemeStyle(content.theme)} className="public-site relative">
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
      <ModuleRenderer modules={headerModules} globals={{ theme: content.theme }} />
      <ModuleRenderer
        modules={modules}
        portfolioWorks={works}
        globals={{
          instagramUrl: content.brand.instagramUrl,
          facebookUrl: content.brand.facebookUrl,
          contact: content.contact,
          calendar,
          theme: content.theme,
        }}
      />
      <ModuleRenderer modules={footerModules} globals={{ theme: content.theme }} />
    </main>
  );
}
