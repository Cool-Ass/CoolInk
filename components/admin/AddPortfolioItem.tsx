"use client";

import { useState } from "react";
import PortfolioForm from "@/components/admin/PortfolioForm";
import AppModal from "@/components/ui/AppModal";
import AppButton from "@/components/ui/AppButton";

export default function AddPortfolioItem() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppButton
        type="button"
        onClick={() => setOpen(true)}
      >
        + DODAJ ELEMENT
      </AppButton>
      {open && <AppModal title="Nowy element portfolio" subtitle="Dodaj zdjęcie, opis i kategorię." size="lg" onClose={() => setOpen(false)}>
        <PortfolioForm onSaved={() => setOpen(false)} />
      </AppModal>}
    </>
  );
}
