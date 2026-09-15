import { redirect } from "next/navigation";
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
    <main className="flex min-h-screen items-center bg-ink-black text-ink-white">
      <div className="mx-auto w-full max-w-7xl">
        <ModuleRenderer modules={modules} globals={{ theme: content.theme, instagramUrl: content.brand.instagramUrl, facebookUrl: content.brand.facebookUrl, contact: content.contact, clientAuth: { oauthError: error, returnTo: safeReturnTo, bookingIntent: hasBookingIntent } }} />
      </div>
    </main>
  );
}
