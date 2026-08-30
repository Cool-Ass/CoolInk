"use client";

import { useState, type ReactNode } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ConfirmButton({
  onConfirm,
  label,
  confirmText = "Czy na pewno? Tej operacji nie można cofnąć.",
  className = "",
  pendingLabel = "Przetwarzanie…",
}: {
  onConfirm: () => Promise<void> | void;
  label: ReactNode;
  confirmText?: string;
  className?: string;
  pendingLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && <ConfirmModal message={confirmText} onCancel={() => setOpen(false)} onConfirm={handleConfirm} pending={pending} pendingLabel={pendingLabel} />}
    </>
  );
}
