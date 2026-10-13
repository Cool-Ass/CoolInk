"use client";

import AppModal from "@/components/ui/AppModal";
import AppButton from "@/components/ui/AppButton";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

export default function ConfirmModal({ message, onCancel, onConfirm, pending = false, pendingLabel = "Przetwarzanie…" }: { message: string; onCancel: () => void; onConfirm: () => void; pending?: boolean; pendingLabel?: string }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const dialog = <AppModal title="Potwierdź akcję" size="sm" priority onClose={pending ? () => undefined : onCancel} closeOnBackdrop={!pending} footer={<div className="flex justify-end gap-3"><AppButton type="button" variant="destructive" onClick={onCancel} disabled={pending}>Anuluj</AppButton><AppButton type="button" variant="success" onClick={onConfirm} disabled={pending}>{pending ? pendingLabel : "Potwierdź"}</AppButton></div>}><p className="text-[14px] leading-relaxed text-ink-white">{message}</p></AppModal>;
  // Keep server and the first client render identical, then lift nested
  // confirmations above their parent modal once the browser is mounted.
  return mounted ? createPortal(dialog, document.body) : dialog;
}
