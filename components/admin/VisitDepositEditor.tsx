"use client";
import { useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { DEPOSIT_STATUS } from "@/lib/projectWorkflow";
import { depositStatusLabel } from "@/lib/workflowStatus";
type Deposit = { status: string; amount: number | null; paymentMethod: string | null };
export default function VisitDepositEditor({ appointmentId, updatedAt, date, initial, legacy, onBusyChange, onSaved }: { appointmentId: string; updatedAt: string; date: string; initial: Deposit; legacy: Deposit | null; onBusyChange: (busy: boolean) => void; onSaved: () => void }) {
  const [status, setStatus] = useState(initial.status);
  const [amount, setAmount] = useState(String(initial.amount ?? ""));
  const [method, setMethod] = useState(initial.paymentMethod ?? "");
  const [confirmation, setConfirmation] = useState<"save" | "assign_legacy" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy || !confirmation) return;
    setBusy(true); onBusyChange(true); setError("");
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}/deposit`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(confirmation === "assign_legacy" ? { action: confirmation, expectedUpdatedAt: updatedAt } : { status, amount: amount === "" ? null : Number(amount), paymentMethod: method, expectedUpdatedAt: updatedAt }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Nie udało się zapisać zadatku.");
      setConfirmation(null); onSaved();
    } catch (reason) { setConfirmation(null); setError(reason instanceof Error ? reason.message : "Błąd połączenia."); }
    finally { setBusy(false); onBusyChange(false); }
  }
  return <section className="rounded-xl border border-ink-gold/30 p-4"><h3 className="font-semibold">Zadatek tej wizyty</h3><p className="mt-1 text-xs text-ink-grey">{date}</p>
    {legacy ? <div className="mt-3 space-y-3"><p className="text-sm text-ink-grey">Dotychczasowy zadatek projektu: {legacy.amount} zł · {depositStatusLabel(legacy.status)}. Wybierz właściwą wizytę i przypisz go jednokrotnie. Nie jest to nowa wpłata.</p><button type="button" disabled={busy} onClick={() => setConfirmation("assign_legacy")} className="studio-primary-link">Przypisz do tej wizyty</button></div> : <form onSubmit={event => { event.preventDefault(); setConfirmation("save"); }} className="mt-4 space-y-3"><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-ink-grey">Status<select aria-label="Status zadatku" value={status} onChange={event => setStatus(event.target.value)} className="mt-1 w-full border border-ink-white/20 bg-ink-black p-2 text-sm">{DEPOSIT_STATUS.map(value => <option key={value} value={value}>{depositStatusLabel(value)}</option>)}</select></label><label className="text-xs text-ink-grey">Kwota (zł)<input type="number" min="0" max="10000000" step="1" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full border border-ink-white/20 bg-transparent p-2 text-sm" /></label><label className="text-xs text-ink-grey">Metoda płatności<input maxLength={80} value={method} onChange={event => setMethod(event.target.value)} placeholder="BLIK / gotówka" className="mt-1 w-full border border-ink-white/20 bg-transparent p-2 text-sm" /></label></fieldset><p className="text-xs text-ink-grey">Status „Opłacony” ustaw dopiero po sprawdzeniu wpłaty. Zadatek nie rozlicza automatycznie ceny sesji ani pieczątek.</p><button disabled={busy} className="studio-primary-link">Zapisz zadatek</button></form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {confirmation && <ConfirmModal pending={busy} message={confirmation === "assign_legacy" ? `Przypisać istniejący zadatek ${legacy?.amount} zł (${depositStatusLabel(legacy?.status ?? "")}) do wizyty ${date}? Nie twórz drugiej wpłaty.` : `Zapisać zadatek ${amount || "0"} zł — ${depositStatusLabel(status)} — dla wizyty ${date}?${status === "paid" ? " Potwierdzasz rzeczywiste otrzymanie wpłaty." : ""}`} onConfirm={() => void save()} onCancel={() => { if (!busy) setConfirmation(null); }} />}
  </section>;
}
