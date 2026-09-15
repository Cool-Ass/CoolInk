"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

export interface PageSettingsValues {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  showInNav: boolean;
  navOrder: number;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PageSettingsModal({
  initial,
  isHomepage,
  onSave,
  onClose,
  saving,
}: {
  initial: PageSettingsValues;
  isHomepage: boolean;
  onSave: (values: PageSettingsValues) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState(initial);
  const dialogRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); previousFocus?.focus(); };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(values);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-2 sm:p-4" onClick={onClose}>
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="builder-floating-panel flex max-h-[calc(100dvh-1rem)] min-h-0 w-full max-w-lg flex-col gap-5 overflow-y-auto overscroll-contain border border-white/20 bg-ink-charcoal p-4 shadow-2xl [scrollbar-gutter:stable] sm:max-h-[85vh] sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <p id={titleId} className="pt-3 text-[14px] text-white">Ustawienia strony</p>
          <button type="button" onClick={onClose} aria-label="Zamknij ustawienia strony" className="flex h-11 min-w-11 shrink-0 items-center justify-center border border-white/20 text-lg text-white/65 hover:border-white/40 hover:text-white">
            <span aria-hidden>×</span>
          </button>
        </div>

        <label className="flex flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey">
          TYTUŁ
          <input
            type="text"
            required
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="min-h-11 w-full min-w-0 border border-white/20 bg-[#17191c] px-3 text-[14px] text-white outline-none hover:border-white/35 focus-visible:border-ink-gold"
          />
        </label>

        {!isHomepage && (
          <label className="flex flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey">
            ADRES URL
            <div className="flex min-w-0 items-center border border-white/20 hover:border-white/35 focus-within:border-ink-gold">
              <span className="pl-3 text-[14px] text-ink-grey">/</span>
              <input
                type="text"
                required
                value={values.slug}
                onChange={(e) => setValues((v) => ({ ...v, slug: slugify(e.target.value) }))}
                className="min-h-11 min-w-0 flex-1 bg-[#17191c] px-2 text-[14px] text-white outline-none"
              />
            </div>
          </label>
        )}

        <label className="flex flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey">
          KRÓTKI OPIS (SEO, opcjonalnie)
          <input
            type="text"
            value={values.excerpt}
            onChange={(e) => setValues((v) => ({ ...v, excerpt: e.target.value }))}
            className="min-h-11 w-full min-w-0 border border-white/20 bg-[#17191c] px-3 text-[14px] text-white outline-none hover:border-white/35 focus-visible:border-ink-gold"
          />
        </label>

        {!isHomepage && (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-transparent px-2 text-[13px] text-white hover:border-white/20 focus-within:border-ink-gold">
              <input
                type="checkbox"
                checked={values.showInNav}
                onChange={(e) => setValues((v) => ({ ...v, showInNav: e.target.checked }))}
                className="h-5 w-5 accent-[#c99a4a]"
              />
              Pokaż w menu nawigacji
            </label>
            {values.showInNav && (
              <label className="flex max-w-[160px] flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey">
                KOLEJNOŚĆ W MENU
                <input
                  type="number"
                  value={values.navOrder}
                  onChange={(e) => setValues((v) => ({ ...v, navOrder: Number(e.target.value) }))}
                  className="min-h-11 w-full border border-white/20 bg-[#17191c] px-3 text-[14px] text-white outline-none hover:border-white/35 focus-visible:border-ink-gold"
                />
              </label>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 inline-flex items-center justify-center gap-2 self-start border border-ink-gold px-6 py-3 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
        >
          {saving ? "ZAPISYWANIE…" : "ZAPISZ USTAWIENIA"}
        </button>
      </form>
    </div>
  );
}
