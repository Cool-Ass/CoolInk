"use client";

import { useState } from "react";
import { blikDepositDetails } from "@/lib/blikDeposit";

type Props = { project: Parameters<typeof blikDepositDetails>[0] };

export default function BlikDeposit({ project }: Props) {
  const details = blikDepositDetails(project);
  const [feedback, setFeedback] = useState("");
  const [copying, setCopying] = useState(false);
  if (!details) return null;

  async function copy(value: string, label: string) {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} — skopiowano.`);
    } catch {
      setFeedback("Nie udało się skopiować. Przepisz dane widoczne powyżej.");
    } finally { setCopying(false); }
  }

  return <section aria-label="Zadatek BLIK na telefon" className="rounded-xl border border-ink-gold/30 bg-ink-gold/5 p-4">
    <h3 className="text-base font-semibold">Wpłać zadatek BLIK na telefon</h3>
    <p className="mt-2 text-sm text-ink-grey">W aplikacji swojego banku wybierz przelew BLIK na telefon. Przed zatwierdzeniem sprawdź numer odbiorcy i kwotę.</p>
    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        { label: "Numer telefonu", value: details.phoneLabel, copyValue: details.phone },
        { label: "Kwota zadatku", value: `${details.amount.toLocaleString("pl-PL")} zł`, copyValue: String(details.amount) },
        { label: "Tytuł przelewu", value: details.reference, copyValue: details.reference },
      ].map(item => <div key={item.label} className="min-w-0">
        <dt className="text-xs text-ink-grey">{item.label}</dt>
        <dd className="mt-1 select-text break-words text-sm font-medium">{item.value}</dd>
        <button type="button" disabled={copying} onClick={() => void copy(item.copyValue, item.label)} className="mt-1 min-h-11 rounded-md px-2 text-xs text-ink-gold hover:bg-ink-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-gold disabled:opacity-50" aria-label={`Kopiuj: ${item.label}`}>Kopiuj</button>
      </div>)}
    </dl>
    <p className="mt-3 text-xs leading-relaxed text-ink-grey">Jeśli bank pozwala, wpisz podany tytuł przelewu. Potwierdzenie zadatku pojawi się po sprawdzeniu wpłaty przez studio. Skopiowanie danych nie oznacza zapłaty. Nie podawaj nam sześciocyfrowego kodu BLIK.</p>
    <p role="status" aria-live="polite" className="mt-2 text-xs text-ink-grey">{feedback}</p>
  </section>;
}
