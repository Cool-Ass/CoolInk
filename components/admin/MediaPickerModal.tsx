"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { imageSource } from "@/lib/imageSource";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  alt: string | null;
}

export default function MediaPickerModal({
  onSelect,
  onSelectMany,
  onClose,
  multiple = false,
}: {
  onSelect: (url: string) => void;
  onSelectMany?: (urls: string[]) => void;
  onClose: () => void;
  multiple?: boolean;
}) {
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/media")
      .then((res) => res.json())
      .then((data) => setMedia(data.media ?? []))
      .catch(() => setError("Nie udało się wczytać biblioteki mediów."));
  }, []);

  const filtered = (media ?? []).filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.filename.toLowerCase().includes(q) || (m.alt ?? "").toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col border border-ink-white/15 bg-ink-charcoal shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink-white/10 px-6 py-4">
          <div>
            <p className="text-[14px] tracking-[0.05em] text-ink-white">Wybierz zdjęcie</p>
            <p className="mt-1 text-[11px] text-ink-grey">{multiple ? "Zaznacz zdjęcia i dodaj je jednym kliknięciem." : "Kliknij obraz, aby od razu użyć go w tej sekcji."}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[13px] text-ink-grey transition-colors hover:text-ink-white"
          >
            Zamknij ✕
          </button>
        </div>

        <div className="border-b border-ink-white/10 px-6 py-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie pliku lub opisie…"
            className="w-full border border-ink-white/20 bg-transparent px-3 py-2 text-[13px] text-ink-white outline-none focus:border-ink-gold"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="text-[13px] text-red-400">{error}</p>}
          {!media && !error && (
            <p className="text-[13px] text-ink-grey">Wczytywanie…</p>
          )}
          {media && filtered.length === 0 && (
            <p className="text-[13px] text-ink-grey">Brak wyników. Spróbuj innej nazwy lub prześlij nowe zdjęcie.</p>
          )}
          {filtered.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {filtered.map((item) => {
                const source = imageSource(item.url);
                if (!source) return null;
                return <button
                  key={item.id}
                  type="button"
                  onClick={() => multiple ? setSelected((prev) => prev.includes(item.url) ? prev.filter((url) => url !== item.url) : [...prev, item.url]) : onSelect(item.url)}
                  className={`group relative aspect-square overflow-hidden border transition-all hover:-translate-y-0.5 hover:border-ink-gold ${selected.includes(item.url) ? "border-ink-gold ring-1 ring-ink-gold" : "border-ink-white/10"}`}
                  title={`Wybierz: ${item.filename}`}
                >
                  <Image
                    src={source}
                    alt={item.alt ?? ""}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="200px"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-ink-black/80 px-2 py-1 text-left text-[10px] text-ink-white opacity-0 transition-opacity group-hover:opacity-100">
                    {item.filename}
                  </span>
                </button>;
              })}
            </div>
          )}
        </div>
        {multiple && <div className="flex items-center justify-between border-t border-ink-white/10 px-6 py-4"><p className="text-[12px] text-ink-grey">Wybrano: {selected.length}</p><button type="button" disabled={selected.length === 0} onClick={() => onSelectMany?.(selected)} className="border border-ink-gold px-4 py-2 text-[11px] tracking-[0.08em] text-ink-gold disabled:opacity-40">DODAJ WYBRANE</button></div>}
      </div>
    </div>
  );
}
