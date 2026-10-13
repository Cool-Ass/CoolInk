"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ui/ConfirmModal";
export default function AftercareConsultation({ id, requested }: { id: string; requested: boolean }) {
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState(""); const router = useRouter();
  async function submit() {
    setBusy(true); setFeedback("");
    try { const response = await fetch(`/api/client/aftercare/${id}/consultation`, { method: "POST" }); const result = await response.json(); if (!response.ok) throw Error(result.error || "Nie udało się zgłosić konsultacji."); setFeedback("Prośba wysłana. Studio odpowie w rozmowie projektu."); setConfirm(false); router.refresh(); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Błąd połączenia."); } finally { setBusy(false); }
  }
  return <div><button disabled={requested || busy} className="studio-primary-link" onClick={() => setConfirm(true)}>{requested ? "Konsultacja zgłoszona" : "Poproś studio o konsultację"}</button><p role="status" className="mt-2 text-sm text-ink-grey">{feedback}</p>{confirm && <ConfirmModal pending={busy} message="Wysłać do studia prośbę o konsultację po tej sesji?" onConfirm={() => void submit()} onCancel={() => setConfirm(false)} />}</div>;
}
