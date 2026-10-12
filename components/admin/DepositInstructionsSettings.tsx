"use client";
import { useState } from "react";
import BlikDeposit from "@/components/client/BlikDeposit";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { validateDepositInstructions, type DepositInstructions } from "@/lib/depositInstructions";
export default function DepositInstructionsSettings({ initial }: { initial: DepositInstructions }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function save() {
    if (busy) return;
    setBusy(true); setFeedback("");
    try {
      const instructions = validateDepositInstructions(draft);
      const response = await fetch("/api/admin/settings/deposits", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(instructions) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Nie udało się zapisać ustawień.");
      setDraft(data.instructions); setFeedback("Instrukcje zapisane. Są widoczne klientom przy zadatkach wizyt.");
    } catch (reason) { setFeedback(reason instanceof Error ? reason.message : "Błąd połączenia."); }
    finally { setBusy(false); setConfirm(false); }
  }
  return <div className="grid gap-6 xl:grid-cols-2"><form onSubmit={event => { event.preventDefault(); setConfirm(true); }}><fieldset disabled={busy} className="space-y-4">
    {([{ key: "heading", label: "Nagłówek", max: 120 }, { key: "phone", label: "Telefon BLIK (9 cyfr)", max: 30 }, { key: "cashDescription", label: "Opis wpłaty gotówką", max: 1500 }, { key: "blikDescription", label: "Instrukcja BLIK", max: 1500 }, { key: "extra", label: "Dodatkowa informacja", max: 1500 }] as const).map(item => <label key={item.key} className="block text-sm text-ink-grey">{item.label}{item.max <= 120 ? <input value={draft[item.key]} maxLength={item.max} required onChange={event => setDraft({ ...draft, [item.key]: event.target.value })} className="mt-1 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" /> : <textarea value={draft[item.key]} maxLength={item.max} rows={3} onChange={event => setDraft({ ...draft, [item.key]: event.target.value })} className="mt-1 w-full border border-ink-white/20 bg-transparent p-2 text-ink-white" />}</label>)}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.cashEnabled} onChange={event => setDraft({ ...draft, cashEnabled: event.target.checked })} />Pokaż gotówkę w studiu</label>
    <button className="studio-primary-link">{busy ? "Zapisywanie…" : "Zapisz instrukcje"}</button>
  </fieldset><p role="status" className="mt-3 text-sm text-ink-grey">{feedback}</p></form><div><p className="mb-3 text-xs text-ink-grey">PODGLĄD KLIENTA · przykładowa wizyta, 300 zł</p><BlikDeposit visit={{ id: "WIZYTA-DEMO", status: "confirmed", depositStatus: "awaiting", depositAmount: 300, projectKind: "tattoo", projectStatus: "confirmed" }} instructions={draft} /></div>
    {confirm && <ConfirmModal pending={busy} message={`Opublikować instrukcje wpłaty dla klientów? Sprawdź numer odbiorcy BLIK: ${draft.phone}.`} onConfirm={() => void save()} onCancel={() => { if (!busy) setConfirm(false); }} />}
  </div>;
}
