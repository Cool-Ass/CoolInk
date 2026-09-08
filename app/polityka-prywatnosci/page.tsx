import type { Metadata } from "next";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { PRIVACY_POLICY_HTML, PRIVACY_POLICY_UPDATED_AT } from "@/lib/privacyPolicy";
import { siteThemeStyle } from "@/lib/siteTheme";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Polityka prywatności i RODO | CoolInk Tattoo Studio",
  description: "Zasady przetwarzania danych osobowych klientów CoolInk Tattoo Studio.",
  alternates: { canonical: "/polityka-prywatnosci" },
};

export default async function PrivacyPolicyPage() {
  const content = await getSiteContent();
  const navLinks = await getPublicNavLinks(content.navigation);
  const [headerModules, footerModules] = await Promise.all([
    getPublishedSystemModules("header", content, navLinks),
    getPublishedSystemModules("footer", content, navLinks),
  ]);
  const globals = { theme: content.theme };
  return <main style={siteThemeStyle(content.theme)} className="public-site min-h-screen bg-ink-black text-ink-white">
    <ModuleRenderer modules={headerModules} globals={globals} />
    <article className="mx-auto max-w-3xl px-6 pb-24 pt-36 sm:pt-44">
      <p className="text-xs tracking-[.2em] text-ink-gold">PRYWATNOŚĆ I RODO</p>
      <h1 className="mt-4 font-display text-5xl leading-none sm:text-7xl">Twoje dane. Jasne zasady.</h1>
      <p className="mt-6 border-l-2 border-ink-gold pl-4 text-sm leading-relaxed text-ink-grey">Wersja 1 · aktualizacja: {PRIVACY_POLICY_UPDATED_AT}</p>
      <div className="document-rich-text mt-10 text-[15px] leading-relaxed text-ink-grey" dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }} />
    </article>
    <ModuleRenderer modules={footerModules} globals={globals} />
  </main>;
}
