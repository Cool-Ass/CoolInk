import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { PRIVACY_POLICY_HTML, PRIVACY_POLICY_UPDATED_AT } from "@/lib/privacyPolicy";
import { siteThemeStyle } from "@/lib/siteTheme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Polityka prywatności i RODO | CoolInk Tattoo Studio",
  description: "Zasady przetwarzania danych osobowych klientów CoolInk Tattoo Studio.",
  alternates: { canonical: "/polityka-prywatnosci" },
};

export default async function PrivacyPolicyPage() {
  const content = await getSiteContent();
  const navLinks = await getPublicNavLinks(content.navigation);
  return <main style={siteThemeStyle(content.theme)} className="min-h-screen bg-ink-black text-ink-white">
    <Header navLinks={navLinks} bookLabel={content.header.bookingLabel} bookHref={content.header.bookingHref} clientAreaLabel={content.header.clientAreaLabel} clientAreaHref={content.header.clientAreaHref} logoUrl={content.brand.logoUrl} logoAlt={content.brand.logoAlt} brandName={content.brand.name} />
    <article className="mx-auto max-w-3xl px-6 pb-24 pt-36 sm:pt-44">
      <p className="text-xs tracking-[.2em] text-ink-gold">PRYWATNOŚĆ I RODO</p>
      <h1 className="mt-4 font-display text-5xl leading-none sm:text-7xl">Twoje dane. Jasne zasady.</h1>
      <p className="mt-6 border-l-2 border-ink-gold pl-4 text-sm leading-relaxed text-ink-grey">Wersja 1 · aktualizacja: {PRIVACY_POLICY_UPDATED_AT}</p>
      <div className="document-rich-text mt-10 text-[15px] leading-relaxed text-ink-grey" dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }} />
    </article>
    <Footer navLinks={navLinks} text={content.footer.text} logoUrl={content.brand.logoUrl} logoAlt={content.brand.logoAlt} brandName={content.brand.name} privacyLabel={content.footer.privacyLabel} privacyHref={content.footer.privacyHref} />
  </main>;
}
