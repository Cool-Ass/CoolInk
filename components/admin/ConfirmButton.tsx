"use client";

import { useState, type ReactNode } from "react";

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

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm border border-ink-white/15 bg-ink-charcoal p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] leading-relaxed text-ink-white">{confirmText}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 text-[13px] text-ink-grey transition-colors hover:text-ink-white disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="border border-red-500/70 px-4 py-2 text-[13px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                {pending ? pendingLabel : "Potwierdź"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
