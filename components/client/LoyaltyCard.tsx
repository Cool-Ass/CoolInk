"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Check } from "lucide-react";
import type { getLoyaltyCard } from "@/lib/loyalty";
import { loyaltySettlement } from "@/lib/loyaltyRules";

type Card = Awaited<ReturnType<typeof getLoyaltyCard>>;
type Visit = { id: string; title: string; date: string; price: number | null };
const money = (cents: number) => (cents / 100).toLocaleString("pl-PL", { style: "currency", currency: "PLN" });

export default function LoyaltyCard({ card, clientId, visits = [] }: { card: Card; clientId?: string; visits?: Visit[] }) {
  const router = useRouter();
  const [visitId, setVisitId] = useState("");
  const [amount, setAmount] = useState("1400");
  const [redeem, setRedeem] = useState(false);
  const [paid, setPaid] = useState(false);
  const [stamps, setStamps] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  let quote: ReturnType<typeof loyaltySettlement> | null = null;
  const validAmount = /^\d+(?:[.,]\d{1,2})?$/.test(amount);
  const grossCents = Math.round(Number(amount.replace(",", ".")) * 100);
  try { if (validAmount) quote = loyaltySettlement(grossCents, redeem, card.balance); } catch { /* Shown beside the form. */ }

  async function save(body: Record<string, unknown>) {
    if (busy || !clientId) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/loyalty`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać.");
      setMessage("Zapisano. Karta została zaktualizowana."); setPaid(false); setVisitId(""); setRedeem(false); setNote("");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Błąd połączenia."); }
    finally { setBusy(false); }
  }

  return <section className="studio-panel space-y-4" aria-label="Karta lojalnościowa">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="studio-eyebrow">COOLINK • LOJALNOŚĆ</p><h2 className="mt-1 text-lg font-semibold">Twoje tatuaże. Twoje nagrody.</h2></div><Gift aria-hidden className="h-6 w-6 text-ink-gold" /></header>
    <div className="flex flex-wrap items-center gap-4">
      <ol aria-label={`${card.progress} z 5 pieczątek w kolejnym cyklu`} className="flex gap-2">{Array.from({ length: 5 }, (_, index) => <li key={index} aria-label={`Pieczątka ${index + 1}: ${index < card.progress ? "zdobyta" : "do zdobycia"}`} className={`flex h-10 w-10 items-center justify-center rounded-full border ${index < card.progress ? "border-ink-gold bg-ink-gold/15 text-ink-gold" : "border-dashed border-ink-white/25 text-ink-grey"}`}>{index < card.progress ? <Check aria-hidden className="h-4 w-4" /> : <span aria-hidden>{index + 1}</span>}</li>)}</ol>
      <p className="text-sm">{card.rewards > 0 ? <><strong className="text-ink-gold">Dostępne nagrody: {card.rewards} × −50%</strong><span className="block text-xs text-ink-grey">Do 700 zł rabatu na każdą wybraną wizytę. Zgłoś wykorzystanie w studiu.</span></> : <>Jeszcze <strong>{5 - card.progress}</strong> pieczątek do −50%.</>}</p>
    </div>
    <p className="text-xs leading-relaxed text-ink-grey">Jedna pieczątka za zrealizowaną i opłaconą wizytę z tatuażem powyżej 600 zł, niezależnie od projektu. Pięć pieczątek = 50% rabatu, maksymalnie 700 zł. Wizyta z nagrodą i zadatek nie dają pieczątki.</p>
    {clientId && <details className="border-t border-ink-white/10 pt-3"><summary className="cursor-pointer text-sm text-ink-gold">Rozlicz opłaconą wizytę</summary><form onSubmit={(event) => { event.preventDefault(); if (quote && paid && visitId) void save({ action: "settle", appointmentId: visitId, grossCents, redeem, paid }); }} className="mt-3 space-y-3">
      <label className="block text-xs">Zrealizowana wizyta<select required value={visitId} disabled={busy} onChange={(event) => { setVisitId(event.target.value); setAmount(String(visits.find((visit) => visit.id === event.target.value)?.price ?? 1400)); setPaid(false); }} className="mt-1 w-full border border-ink-white/20 bg-ink-black p-2 text-sm"><option value="">Wybierz wizytę…</option>{visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.date} · {visit.title}</option>)}</select></label>
      {!visits.length && <p className="text-xs text-ink-grey">Brak wizyt do rozliczenia. Najpierw oznacz zakończoną wizytę z tatuażem jako zrealizowaną.</p>}
      <label className="block text-xs">Cena po innych rabatach, przed rabatem lojalnościowym (zł)<input required inputMode="decimal" value={amount} disabled={busy} onChange={(event) => { setAmount(event.target.value); setPaid(false); }} className="mt-1 block w-full border border-ink-white/20 bg-ink-black p-2 text-sm" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={redeem} disabled={busy || card.rewards < 1} onChange={(event) => { setRedeem(event.target.checked); setPaid(false); }} />Wykorzystaj 5 pieczątek (−50%, do 700 zł)</label>
      <p aria-live="polite" className="text-sm">{quote ? `Do zapłaty łącznie: ${money(quote.paidCents)} · rabat: ${money(quote.discountCents)} · ${redeem ? "wykorzystanie 5 pieczątek" : quote.stamps ? "+1 pieczątka" : "bez pieczątki"}` : "Podaj poprawną cenę lub wyłącz niedostępny rabat."}</p>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={paid} disabled={busy} onChange={(event) => setPaid(event.target.checked)} />Potwierdzam odbiór całej należności (łącznie z zadatkiem).</label>
      <button type="submit" disabled={busy || !paid || !visitId || !quote} className="studio-primary-link disabled:opacity-40">{busy ? "Zapisywanie…" : "Zapisz rozliczenie"}</button>
    </form></details>}
    {clientId && <details className="border-t border-ink-white/10 pt-3"><summary className="cursor-pointer text-sm">Przenieś papierową kartę</summary><form onSubmit={(event) => { event.preventDefault(); void save({ action: "paper", stamps: Number(stamps), note }); }} className="mt-3 space-y-3"><p className="text-xs text-ink-grey">Jednorazowy import. Oznacz papierową kartę jako przeniesioną, żeby nie użyć jej ponownie.</p><label className="block text-xs">Liczba pieczątek<input type="number" min="1" max="5" required value={stamps} onChange={(event) => setStamps(event.target.value)} className="ml-2 w-16 border border-ink-white/20 bg-ink-black p-2" /></label><label className="block text-xs">Opis weryfikacji karty<input required maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 block w-full border border-ink-white/20 bg-ink-black p-2" /></label><button type="submit" disabled={busy} className="studio-primary-link disabled:opacity-40">Przenieś pieczątki</button></form></details>}
    {message && <p role="status" className="text-sm text-ink-gold">{message}</p>}
    {card.history.length > 0 && <details className="border-t border-ink-white/10 pt-3"><summary className="cursor-pointer text-xs text-ink-grey">Historia karty i rozliczeń (ostatnie 30)</summary><ul className="mt-3 divide-y divide-ink-white/10">{card.history.map((entry) => <li key={entry.id} className="py-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><span>{entry.kind === "paper" ? "Przeniesienie papierowej karty" : entry.note}</span><span>{entry.voidedAt ? "WYCOFANO" : entry.stamps === -5 ? "Rabat wykorzystany" : `+${entry.stamps} pieczątek`}</span></div><p className="mt-1 text-ink-grey">{new Date(entry.createdAt).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}{entry.kind === "visit" && ` · opłacono ${money(entry.paidCents)} · rabat ${money(entry.discountCents)}`}</p>{clientId && !entry.voidedAt && <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("Powód wycofania (np. zwrot płatności). Wpis pozostanie w historii; tej wizyty nie rozliczysz ponownie."); if (reason?.trim()) void save({ action: "void", entryId: entry.id, note: reason }); }} className="mt-1 text-red-300 underline">Wycofaj z powodem</button>}</li>)}</ul></details>}
  </section>;
}
