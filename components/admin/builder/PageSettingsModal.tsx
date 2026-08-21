"use client";

import { useState, type FormEvent } from "react";

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(values);
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto border border-ink-white/15 bg-ink-charcoal p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-[14px] text-ink-white">Ustawienia strony</p>
          <button type="button" onClick={onClose} className="text-[13px] text-ink-grey hover:text-ink-white">
            Zamknij ✕
          </button>
        </div>

        <label className="flex flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey">
          TYTUŁ
          <input
            type="text"
            required
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-[14px] text-ink-white outline-none focus:border-ink-gold"
          />
        </label>

        {!isHomepage && (
          <label className="flex flex-col gap-2 text-[12px] tracking-[0.1em] text-ink-grey">
            ADRES URL
            <div className="flex items-center border border-ink-white/20 focus-within:border-ink-gold">
              <span className="pl-3 text-[14px] text-ink-grey">/</span>
              <input
                type="text"
                required
                value={values.slug}
                onChange={(e) => setValues((v) => ({ ...v, slug: slugify(e.target.value) }))}
                className="flex-1 bg-transparent px-2 py-2.5 text-[14px] text-ink-white outline-none"
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
            className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-[14px] text-ink-white outline-none focus:border-ink-gold"
          />
        </label>

        {!isHomepage && (
          <>
            <label className="flex items-center gap-3 text-[13px] text-ink-white">
              <input
                type="checkbox"
                checked={values.showInNav}
                onChange={(e) => setValues((v) => ({ ...v, showInNav: e.target.checked }))}
                className="h-4 w-4 accent-[#c99a4a]"
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
                  className="border border-ink-white/20 bg-transparent px-3 py-2.5 text-[14px] text-ink-white outline-none focus:border-ink-gold"
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
