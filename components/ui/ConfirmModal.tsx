"use client";

import AppModal from "@/components/ui/AppModal";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

export default function ConfirmModal({ message, onCancel, onConfirm, pending = false, pendingLabel = "Przetwarzanie…" }: { message: string; onCancel: () => void; onConfirm: () => void; pending?: boolean; pendingLabel?: string }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const dialog = <AppModal title="Potwierdź akcję" size="sm" priority onClose={pending ? () => undefined : onCancel} closeOnBackdrop={!pending} footer={<div className="flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={pending} className="px-4 py-2 text-[13px] text-ink-grey transition-colors hover:text-ink-white disabled:opacity-50">Anuluj</button><button type="button" onClick={onConfirm} disabled={pending} className="border border-red-500/70 px-4 py-2 text-[13px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">{pending ? pendingLabel : "Potwierdź"}</button></div>}><p className="text-[14px] leading-relaxed text-ink-white">{message}</p></AppModal>;
  // Keep server and the first client render identical, then lift nested
  // confirmations above their parent modal once the browser is mounted.
  return mounted ? createPortal(dialog, document.body) : dialog;
}
