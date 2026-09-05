import Link from "next/link";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-ink-black px-6 text-center text-ink-white"><div><p className="text-xs tracking-[.2em] text-ink-gold">BŁĄD 404</p><h1 className="mt-4 font-display text-6xl">Tej strony tu nie ma.</h1><p className="mx-auto mt-4 max-w-md text-ink-grey">Wróć na stronę studia albo od razu sprawdź dostępne terminy.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="border border-ink-white/30 px-5 py-3 text-sm">STRONA GŁÓWNA</Link><Link href="/#kalendarz" className="border border-ink-gold bg-ink-gold px-5 py-3 text-sm text-ink-black">WOLNE TERMINY</Link></div></div></main>;
}
