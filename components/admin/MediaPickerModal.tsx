"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    fetch("/api/admin/media")
      .then((res) => res.json())
      .then((data) => setMedia(data.media ?? []))
      .catch(() => setError("Nie udało się wczytać biblioteki mediów."));
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  const filtered = (media ?? []).filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.filename.toLowerCase().includes(q) || (m.alt ?? "").toLowerCase().includes(q);
  });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="builder-floating-panel flex max-h-[calc(100dvh-1rem)] min-h-0 w-full max-w-3xl flex-col overflow-hidden border border-white/20 bg-ink-charcoal shadow-2xl sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p id={titleId} className="text-[14px] tracking-[0.05em] text-white">Wybierz zdjęcie</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/60">{multiple ? "Zaznacz zdjęcia i dodaj je jednym kliknięciem." : "Kliknij obraz, aby od razu użyć go w tej sekcji."}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij bibliotekę mediów"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/20 text-lg text-white/65 transition-colors hover:border-white/40 hover:text-white"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="shrink-0 border-b border-white/10 px-3 py-3 sm:px-6">
          <label htmlFor={`${titleId}-search`} className="sr-only">Szukaj w bibliotece mediów</label>
          <input
            id={`${titleId}-search`}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj po nazwie pliku lub opisie…"
            className="min-h-11 w-full min-w-0 border border-white/20 bg-[#17191c] px-3 text-[13px] text-white outline-none hover:border-white/35 focus-visible:border-ink-gold"
          />
        </div>

        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-gutter:stable] sm:p-6">
          {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
          {!media && !error && (
            <p role="status" className="text-[13px] text-white/60">Wczytywanie…</p>
          )}
          {media && filtered.length === 0 && (
            <p role="status" className="text-[13px] text-white/60">Brak wyników. Spróbuj innej nazwy lub prześlij nowe zdjęcie.</p>
          )}
          {filtered.length > 0 && (
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
              {filtered.map((item) => {
                const source = imageSource(item.url);
                if (!source) return null;
                return <button
                  key={item.id}
                  type="button"
                  aria-pressed={multiple ? selected.includes(item.url) : undefined}
                  aria-label={`${multiple ? selected.includes(item.url) ? "Odznacz" : "Zaznacz" : "Wybierz"}: ${item.filename}`}
                  onClick={() => multiple ? setSelected((prev) => prev.includes(item.url) ? prev.filter((url) => url !== item.url) : [...prev, item.url]) : onSelect(item.url)}
                  className={`group relative aspect-square min-w-0 overflow-hidden border transition-colors hover:border-ink-gold ${selected.includes(item.url) ? "border-ink-gold ring-2 ring-ink-gold" : "border-white/15"}`}
                  title={`Wybierz: ${item.filename}`}
                >
                  <Image
                    src={source}
                    alt={item.alt ?? ""}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="200px"
                  />
                  <span className={`pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/85 px-2 py-1.5 text-left text-[10px] text-white transition-opacity ${selected.includes(item.url) ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
                    {item.filename}
                  </span>
                </button>;
              })}
            </div>
          )}
        </div>
        {multiple && <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-3 py-3 sm:px-6 sm:py-4"><p aria-live="polite" className="text-[12px] text-white/65">Wybrano: {selected.length}</p><button type="button" disabled={selected.length === 0} onClick={() => onSelectMany?.(selected)} className="min-h-11 border border-ink-gold px-4 text-[11px] tracking-[0.08em] text-ink-gold hover:bg-ink-gold/10 disabled:opacity-40">DODAJ WYBRANE</button></div>}
      </div>
    </div>
  );
}
