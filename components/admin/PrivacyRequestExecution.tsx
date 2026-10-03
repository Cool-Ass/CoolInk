"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import CompactDisclosure from "@/components/ui/CompactDisclosure";
import AppButton from "@/components/ui/AppButton";
export default function PrivacyRequestExecution({ id, revision, status }: { id: string; revision: string; status: string }) {
  const router = useRouter(); const [confirmation, setConfirmation] = useState(""); const [backupRunId, setBackupRunId] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  if (!["awaiting_execution", "awaiting_retention_execution", "executing", "execution_failed"].includes(status)) return null;
  async function execute(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/privacy-requests/${encodeURIComponent(id)}/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation, backupRunId, expectedRevision: revision }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setMessage("Zatwierdzony zakres wykonany. Dane objęte retencją zachowano."); setConfirmation("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie potwierdzono wykonania."); }
    finally { setBusy(false); router.refresh(); }
  }
  return <CompactDisclosure title="OSOBNE POTWIERDZENIE WYKONANIA" summary={status === "execution_failed" ? "Ponów niedokończone wykonanie" : "Nieodwracalne — tylko właściciel"}>
    <form onSubmit={execute} className="space-y-2 text-xs">
      <p>Usuwane będą wyłącznie dane poza ocenioną retencją. Rozliczenia i podpisane zgody wymagają zachowania wraz z niezbędną identyfikacją. Najpierw zakończ lub anuluj przyszłe wizyty i usuń kopie Google. Profil zostanie zablokowany do końca wykonania; błąd nie będzie oznaczony jako sukces.</p>
      <p>Wymagane: zaszyfrowana kopia main wykonana w ostatniej godzinie oraz późniejszy udany test odtworzenia tej samej wersji. Kopie historyczne wygasają zgodnie z retencją backupu; wykonanie nie kasuje ich w ciemno.</p>
      <fieldset disabled={busy} className="space-y-2 disabled:opacity-60">
        <label className="block">Numer wykonania kopii (GitHub Actions)<input required inputMode="numeric" pattern="[0-9]+" maxLength={30} value={backupRunId} onChange={event => setBackupRunId(event.target.value)} className="mt-1 w-full rounded-lg border border-ink-white/20 bg-transparent p-2" /></label>
        <label className="block">Wpisz: USUŃ {id}<input required autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-red-400/40 bg-transparent p-2" /></label>
        <AppButton type="submit" disabled={busy || confirmation !== `USUŃ ${id}` || !backupRunId}>{busy ? "WYKONYWANIE…" : status === "execution_failed" ? "PONÓW POTWIERDZONE WYKONANIE" : "WYKONAJ ZATWIERDZONY ZAKRES"}</AppButton>
      </fieldset>
      {message && <p role="status" aria-live="polite">{message}</p>}
    </form>
  </CompactDisclosure>;
}
