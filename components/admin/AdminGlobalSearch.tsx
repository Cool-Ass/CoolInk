"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppModal from "@/components/ui/AppModal";

type SearchResult = { type: string; label: string; meta: string; href: string };

export default function AdminGlobalSearch({ onClose }: { onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (response.ok) setResults((await response.json()).results ?? []);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  return <AppModal title="Szukaj w CoolInk" subtitle="Klient, telefon, e-mail, projekt albo treść wiadomości" size="lg" onClose={onClose}>
    <label className="block text-sm text-ink-grey">SZUKANA FRAZA
      <input ref={input} value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) { setResults([]); setLoading(false); } }} placeholder="Np. Kowalski, 500 123 456, róża…" className="mt-2 w-full border border-ink-white/25 bg-ink-black px-4 py-3 text-base text-ink-white outline-none focus:border-ink-gold" />
    </label>
    <div className="mt-5 space-y-2" aria-live="polite">
      {loading && <p className="py-5 text-sm text-ink-grey">Szukam…</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && <p className="py-5 text-sm text-ink-grey">Nie znaleziono pasujących danych.</p>}
      {!loading && results.map((result, index) => <Link key={`${result.href}-${index}`} href={result.href} onClick={onClose} className="block border border-ink-white/15 p-4 transition-colors hover:border-ink-gold hover:bg-ink-gold/5">
        <div className="flex flex-wrap items-center gap-2"><span className="border border-ink-gold/40 px-2 py-1 text-xs text-ink-gold">{result.type}</span><strong className="text-sm font-medium text-ink-white">{result.label}</strong></div>
        <p className="mt-2 line-clamp-2 text-sm text-ink-grey">{result.meta}</p>
      </Link>)}
      {query.trim().length < 2 && <p className="py-5 text-sm text-ink-grey">Wpisz co najmniej dwa znaki.</p>}
    </div>
  </AppModal>;
}
