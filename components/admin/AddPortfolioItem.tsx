"use client";

import { useState } from "react";
import PortfolioForm from "@/components/admin/PortfolioForm";
import AppModal from "@/components/ui/AppModal";

export default function AddPortfolioItem() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 border border-ink-gold px-4 py-2 text-[11px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black"
      >
        + DODAJ ELEMENT
      </button>
      {open && <AppModal title="Nowy element portfolio" subtitle="Dodaj zdjęcie, opis i kategorię." size="lg" onClose={() => setOpen(false)}>
        <PortfolioForm onSaved={() => setOpen(false)} />
      </AppModal>}
    </>
  );
}
