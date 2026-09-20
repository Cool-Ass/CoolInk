"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LoyaltyRules } from "@/lib/loyaltyRules";

const fields = [
  ["thresholdCents", "Pieczątka za kwotę powyżej (zł)", 100],
  ["stampsRequired", "Pieczątki do nagrody", 1],
  ["discountPercent", "Rabat (%)", 1],
  ["maxDiscountCents", "Maksymalny rabat (zł)", 100],
  ["sessionPriceCents", "Domyślna cena sesji (zł)", 100],
] as const;

export default function LoyaltySettings({ initial }: { initial: LoyaltyRules }) {
  const router = useRouter();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map(([key, , scale]) => [key, String(initial[key] / scale)])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    if (busy || !window.confirm("Nowe zasady będą obowiązywać przy kolejnych rozliczeniach. Zmiana liczby pieczątek przeliczy dostępne nagrody z obecnego salda. Historia pozostanie bez zmian. Zapisać?")) return;
    setBusy(true); setMessage("");
    try {
      const body = Object.fromEntries(fields.map(([key, , scale]) => [key, Math.round(Number(values[key].replace(",", ".")) * scale)]));
      const response = await fetch("/api/admin/settings/loyalty", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać.");
      setMessage("Zapisano zasady programu."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Błąd połączenia."); }
    finally { setBusy(false); }
  }}>
    <p className="text-xs text-ink-grey">Próg jest ścisły: dokładnie 800 zł nie daje pieczątki. Cena sesji i limit rabatu są niezależne. Zmiana ustawień nie zmienia historii ani salda pieczątek; zmienia zasady kolejnych rozliczeń i liczbę dostępnych nagród.</p>
    <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label, scale]) => <label key={key} className="text-xs">{label}<input type="number" required min={key === "thresholdCents" ? 0 : 1 / scale} max={key === "stampsRequired" ? 50 : key === "discountPercent" ? 100 : 1_000_000} step={1 / scale} disabled={busy} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className="mt-1 block w-full rounded border border-ink-white/20 bg-ink-black p-2" /></label>)}</div>
    <button disabled={busy} className="studio-primary-link disabled:opacity-40">{busy ? "Zapisywanie…" : "Zapisz zasady"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
