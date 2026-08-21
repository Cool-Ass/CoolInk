"use client";

import { useState } from "react";
import PortfolioForm from "@/components/admin/PortfolioForm";

export default function AddPortfolioItem() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-ink-gold px-5 py-3 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black"
      >
        + DODAJ ELEMENT
      </button>
    );
  }

  return (
    <div className="border border-ink-white/15 bg-ink-charcoal/40 p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[13px] tracking-[0.1em] text-ink-white">Nowy element portfolio</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[12px] text-ink-grey transition-colors hover:text-ink-white"
        >
          Anuluj
        </button>
      </div>
      <PortfolioForm onSaved={() => setOpen(false)} />
    </div>
  );
}
