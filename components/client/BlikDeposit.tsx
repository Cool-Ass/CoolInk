"use client";
import { useState } from "react";
import { Banknote, Copy, Smartphone } from "lucide-react";
import { blikDepositDetails, type DepositVisit } from "@/lib/blikDeposit";
import { DEFAULT_DEPOSIT_INSTRUCTIONS, type DepositInstructions } from "@/lib/depositInstructions";

export default function BlikDeposit({ visit, instructions = DEFAULT_DEPOSIT_INSTRUCTIONS }: { visit: DepositVisit; instructions?: DepositInstructions }) {
  const details = blikDepositDetails(visit, instructions);
  const [feedback, setFeedback] = useState("");
  const [copying, setCopying] = useState(false);
  if (!details) return null;
  async function copy(value: string, label: string) {
    if (copying) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(value); setFeedback(`${label} — skopiowano.`); }
    catch { setFeedback("Nie udało się skopiować. Przepisz dane widoczne powyżej."); }
    finally { setCopying(false); }
  }
  return <section aria-label="Zadatek BLIK na telefon" className="rounded-xl border border-ink-gold/30 bg-ink-gold/5 p-4">
    <h3 className="text-base font-semibold">{instructions.heading}</h3>
    {instructions.cashEnabled && <section className="mt-4 border-b border-ink-gold/30 pb-4" aria-label="Zadatek gotówką w studiu"><h4 className="flex items-center gap-2 text-sm font-semibold"><Banknote aria-hidden className="h-4 w-4 shrink-0 text-ink-gold" />Gotówka w studiu</h4><p className="mt-2 whitespace-pre-line break-words text-sm text-ink-grey">{instructions.cashDescription}</p></section>}
    <h4 className="mt-4 flex items-center gap-2 text-sm font-semibold"><Smartphone aria-hidden className="h-4 w-4 shrink-0 text-ink-gold" />Przelew BLIK na telefon</h4>
    <p className="mt-2 whitespace-pre-line break-words text-sm text-ink-grey">{instructions.blikDescription}</p>
    <dl className="mt-4 grid gap-3 sm:grid-cols-3">{[
      { label: "Numer telefonu", value: details.phoneLabel, copyValue: details.phone },
      { label: "Kwota zadatku", value: `${details.amount.toLocaleString("pl-PL")} zł`, copyValue: String(details.amount) },
      { label: "Tytuł przelewu", value: details.reference, copyValue: details.reference },
    ].map(item => <div key={item.label} className="min-w-0"><dt className="text-xs text-ink-grey">{item.label}</dt><dd className="mt-1 flex items-center gap-1 text-sm font-semibold"><span className="min-w-0 select-text break-words">{item.value}</span><button type="button" disabled={copying} onClick={() => void copy(item.copyValue, item.label)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-gold hover:bg-ink-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold disabled:opacity-50" aria-label={`Kopiuj: ${item.label}`} title={`Kopiuj: ${item.label}`}><Copy aria-hidden className="h-3.5 w-3.5" /></button></dd></div>)}</dl>
    {instructions.extra && <p className="mt-3 whitespace-pre-line break-words text-xs leading-relaxed text-ink-grey">{instructions.extra}</p>}
    <p className="mt-3 text-xs leading-relaxed text-ink-grey">Potwierdzenie zadatku pojawi się po sprawdzeniu wpłaty przez studio. Skopiowanie danych nie oznacza zapłaty. Nie podawaj nam sześciocyfrowego kodu BLIK.</p>
    <p role="status" aria-live="polite" className="mt-2 text-xs text-ink-grey">{feedback}</p>
  </section>;
}
