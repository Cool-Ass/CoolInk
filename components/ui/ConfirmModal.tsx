"use client";

import AppModal from "@/components/ui/AppModal";

export default function ConfirmModal({ message, onCancel, onConfirm, pending = false, pendingLabel = "Przetwarzanie…" }: { message: string; onCancel: () => void; onConfirm: () => void; pending?: boolean; pendingLabel?: string }) {
  return <AppModal title="Potwierdź akcję" size="sm" onClose={pending ? () => undefined : onCancel} closeOnBackdrop={!pending} footer={<div className="flex justify-end gap-3"><button type="button" onClick={onCancel} disabled={pending} className="px-4 py-2 text-[13px] text-ink-grey transition-colors hover:text-ink-white disabled:opacity-50">Anuluj</button><button type="button" onClick={onConfirm} disabled={pending} className="border border-red-500/70 px-4 py-2 text-[13px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">{pending ? pendingLabel : "Potwierdź"}</button></div>}><p className="text-[14px] leading-relaxed text-ink-white">{message}</p></AppModal>;
}
