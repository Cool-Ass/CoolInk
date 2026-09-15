import { redirect } from "next/navigation";
import ClientAccountForm from "@/components/client/ClientAccountForm";
import ModuleRenderer from "@/components/ModuleRenderer";
import { getCurrentClient } from "@/lib/clientAuth";
import { getSiteContent } from "@/lib/content";
import { getPublicNavLinks } from "@/lib/nav";
import { getPublishedSystemModules } from "@/lib/systemPages";

export const metadata = {
  title: "Konto klienta | CoolInk Tattoo Studio",
  description: "Bezpieczna strefa klienta CoolInk Tattoo Studio.",
};

export default async function ClientAppEntryPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { error, returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/app/") ? returnTo : "/app/portal";
  if (await getCurrentClient()) redirect("/app/portal");
  const content = await getSiteContent();
  const navLinks = await getPublicNavLinks(content.navigation);
  const modules = await getPublishedSystemModules("clientLogin", content, navLinks);
  const hasBookingIntent = safeReturnTo.includes("booking=");
  return (
    <main className="flex min-h-screen items-center bg-ink-black px-5 py-10 text-ink-white">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <ModuleRenderer modules={modules} globals={{ theme: content.theme, instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl, contact: content.contact }} />
        <div>{hasBookingIntent && <div className="mb-4 border-l-2 border-ink-gold bg-ink-gold/5 px-4 py-3 text-sm leading-relaxed text-ink-grey">Wybrałeś termin. Po zalogowaniu wrócimy do jego rezerwacji.</div>}<ClientAccountForm oauthError={error} returnTo={safeReturnTo} /></div>
      </div>
    </main>
  );
}
