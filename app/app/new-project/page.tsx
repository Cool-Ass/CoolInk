import Link from "next/link";
import ProjectRequestForm from "@/components/client/ProjectRequestForm";

export const metadata = { title: "Nowy projekt | CoolInk Tattoo Studio" };

export default function NewProjectPage() { return <main className="min-h-screen bg-ink-black px-6 py-12 text-ink-white md:py-20"><div className="mx-auto max-w-2xl"><Link href="/app" className="text-[11px] tracking-[0.12em] text-ink-grey hover:text-ink-gold">← KONTO KLIENTA</Link><p className="mt-10 text-[11px] tracking-[0.18em] text-ink-gold">COOLINK TATTOO STUDIO</p><h1 className="mt-4 font-display text-4xl md:text-6xl">Opowiedz nam o swoim tatuażu.</h1><p className="mt-5 max-w-xl leading-relaxed text-ink-grey">To zajmie kilka minut. Zgłoszenie trafia bezpośrednio do naszego panelu, gdzie je przejrzymy.</p><div className="mt-10"><ProjectRequestForm /></div></div></main>; }
