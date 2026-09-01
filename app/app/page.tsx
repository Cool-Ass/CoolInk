import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import ClientAccountForm from "@/components/client/ClientAccountForm";
import { getCurrentClient } from "@/lib/clientAuth";
import { getSiteContent } from "@/lib/content";
import { imageSource } from "@/lib/imageSource";

export const metadata = {
  title: "Konto klienta | CoolInk Tattoo Studio",
  description: "Bezpieczna strefa klienta CoolInk Tattoo Studio.",
};

export default async function ClientAppEntryPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { error, returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/app/") ? returnTo : "/app/portal";
  if (await getCurrentClient()) redirect("/app/portal");
  const content = await getSiteContent();
  const logoSource = imageSource(content.brand.logoUrl);
  const hasBookingIntent = safeReturnTo.includes("booking=");
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-black px-6 py-16 text-ink-white">
      <section className="w-full max-w-2xl border border-ink-white/15 bg-ink-charcoal/40 p-8 md:p-12">
        <div className="relative h-12 w-40">{logoSource ? <Image src={logoSource} alt="CoolInk Tattoo Studio" fill sizes="160px" className="object-contain object-left" /> : <span className="font-display text-2xl tracking-[0.08em] text-ink-white">COOLINK</span>}</div>
        <h1 className="mt-5 font-display text-4xl leading-tight md:text-6xl">STREFA KLIENTA</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-grey md:text-lg">Sprawdź wolne terminy, umów wizytę, śledź jej status, rozmawiaj ze studiem, przesyłaj inspiracje i miej wszystkie informacje o swoich projektach w jednym miejscu.</p>
        <div className="mt-9 grid items-start gap-9 md:grid-cols-[1fr_auto]"><div className="space-y-5">{hasBookingIntent && <div className="border-l-2 border-ink-gold bg-ink-gold/5 px-4 py-3 text-sm leading-relaxed text-ink-grey">Wybrałeś termin. Po zalogowaniu wrócimy do jego rezerwacji.</div>}<div className="flex flex-wrap gap-3"><Link href="/#kalendarz" className="border border-ink-gold px-5 py-3 text-[12px] tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black">SPRAWDŹ KALENDARZ</Link><Link href="/" className="border border-ink-white/30 px-5 py-3 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold">← WRÓĆ NA STRONĘ</Link></div></div><ClientAccountForm oauthError={error} returnTo={safeReturnTo} /></div>
      </section>
    </main>
  );
}
