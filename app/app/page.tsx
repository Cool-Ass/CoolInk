import Link from "next/link";
import { redirect } from "next/navigation";
import ClientAccountForm from "@/components/client/ClientAccountForm";
import { getCurrentClient } from "@/lib/clientAuth";

export const metadata = {
  title: "Konto klienta | CoolInk Tattoo Studio",
  description: "Bezpieczna strefa klienta CoolInk Tattoo Studio.",
};

export default async function ClientAppEntryPage() {
  if (await getCurrentClient()) redirect("/app/portal");
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-black px-6 py-16 text-ink-white">
      <section className="w-full max-w-2xl border border-ink-white/15 bg-ink-charcoal/40 p-8 md:p-12">
        <p className="text-[11px] tracking-[0.2em] text-ink-gold">COOLINK · STREFA KLIENTA</p>
        <h1 className="mt-5 font-display text-4xl leading-tight md:text-6xl">Twoje konto CoolInk.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-grey md:text-lg">W jednym miejscu wyślesz pomysł, dodasz inspiracje, sprawdzisz status projektu i zobaczysz swoje wizyty.</p>
        <div className="mt-9 grid items-start gap-9 md:grid-cols-[1fr_auto]"><div className="space-y-5"><div className="border-l-2 border-ink-gold bg-ink-gold/5 px-4 py-3 text-sm leading-relaxed text-ink-grey">Masz już zgłoszenie? Załóż konto na ten sam adres e-mail — połączymy je z Twoją historią.</div><div className="flex flex-wrap gap-3"><Link href="/app/new-project" className="border border-ink-gold px-5 py-3 text-[12px] tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black">ZGŁOŚ NOWY PROJEKT</Link><Link href="/" className="border border-ink-white/30 px-5 py-3 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold">← WRÓĆ NA STRONĘ</Link></div></div><ClientAccountForm /></div>
      </section>
    </main>
  );
}
