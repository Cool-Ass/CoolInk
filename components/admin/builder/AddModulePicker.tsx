"use client";

import { useState } from "react";

import {
  MODULE_TYPE_ORDER,
  MODULE_LABELS,
  MODULE_DESCRIPTIONS,
  MODULE_CATEGORIES,
  type ModuleType,
} from "@/lib/modules";

export default function AddModulePicker({
  onAdd,
  insertAfterSelection,
}: {
  onAdd: (type: ModuleType) => void;
  insertAfterSelection?: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[14px] text-ink-white">Dodaj sekcję</p>
        <p className="mt-1 text-[12px] text-ink-grey">
          {insertAfterSelection
            ? "Nowa sekcja pojawi się bezpośrednio pod aktualnie wybraną sekcją."
            : "Wybierz rodzaj sekcji — dodamy ją na końcu strony."}
        </p>
      </div>

      <div className="border-l-2 border-ink-gold/70 bg-ink-gold/5 px-3 py-2 text-[11px] leading-relaxed text-ink-grey">
        Każdy moduł ma warianty powierzchni, szerokość, odstępy, tło, ramkę, cień,
        widoczność na urządzeniach i bezpieczne deklaracje CSS.
      </div>

      <label className="flex flex-col gap-2 text-[11px] tracking-[.1em] text-ink-grey">
        SZUKAJ MODUŁU
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="np. akordeon, korzyści, HTML…"
          className="border border-ink-white/20 bg-ink-black px-3 py-2.5 text-[13px] text-ink-white outline-none focus:border-ink-gold"
        />
      </label>

      {(["widgets", "templates"] as const).map((category) => {
        const types = MODULE_TYPE_ORDER.filter((type) => {
          if (MODULE_CATEGORIES[type] !== category) return false;
          if (!normalizedQuery) return true;
          return `${MODULE_LABELS[type]} ${MODULE_DESCRIPTIONS[type]}`
            .toLocaleLowerCase("pl-PL")
            .includes(normalizedQuery);
        });
        if (!types.length) return null;
        return (
        <div key={category} className="flex flex-col gap-2">
          <p className="text-[10px] tracking-[0.14em] text-ink-gold">
            {category === "widgets" ? "PODSTAWOWE WIDGETY" : "GOTOWE SEKCJE / SZABLONY"}
          </p>
          {category === "templates" && <p className="-mt-1 text-[11px] leading-relaxed text-ink-grey">Opcjonalne, gotowe układy — możesz je dowolnie edytować lub budować stronę wyłącznie z widgetów.</p>}
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="flex flex-col items-start gap-1 border border-ink-white/15 px-4 py-3 text-left transition-colors hover:border-ink-gold hover:bg-ink-gold/5"
          >
            <span className="text-[13px] text-ink-white">{MODULE_LABELS[type]}</span>
            <span className="text-[11px] leading-snug text-ink-grey">
              {MODULE_DESCRIPTIONS[type]}
            </span>
          </button>
        ))}</div>
        );
      })}
    </div>
  );
}
