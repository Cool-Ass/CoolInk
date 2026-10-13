"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppButton from "@/components/ui/AppButton";
import { VOUCHER_TERMS } from "@/lib/voucherRules";
export default function VouchersPanel() {
  const router = useRouter(); const key = useRef<string | null>(null);
  const [amount, setAmount] = useState(""); const [name, setName] = useState(""); const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [href, setHref] = useState("");
  return <form className="studio-panel space-y-4" onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(""); key.current ??= crypto.randomUUID(); try { const response = await fetch("/api/admin/vouchers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, recipientName: name, validUntil: day, idempotencyKey: key.current }) }); const result = await response.json(); if (!response.ok) throw Error(result.error); setHref(result.href); key.current = null; router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Błąd połączenia."); } finally { setBusy(false); } }}>
    <h2 className="text-lg font-semibold">Nowy voucher</h2><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Wartość (zł)<input className="studio-input mt-2" required inputMode="decimal" value={amount} disabled={busy} onChange={e => { setAmount(e.target.value); setHref(""); }} /></label><label className="text-sm">Imię i nazwisko<input className="studio-input mt-2" required maxLength={160} value={name} disabled={busy} onChange={e => { setName(e.target.value); setHref(""); }} /></label><label className="text-sm">Ważny do<input className="studio-input mt-2" required type="date" value={day} disabled={busy} onChange={e => { setDay(e.target.value); setHref(""); }} /></label></div>
    <p className="text-xs text-ink-grey">{VOUCHER_TERMS} Wystawienie nie potwierdza otrzymania pieniędzy.</p>
    <AppButton type="submit" variant="primary" disabled={busy || Boolean(href)}>{busy ? "Tworzenie…" : "Wygeneruj voucher i QR"}</AppButton>
    {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    {href && <div className="rounded-lg border border-emerald-400/30 p-4"><p className="text-sm text-emerald-200">Voucher gotowy</p><a className="studio-primary-link mt-3" href={href} target="_blank" rel="noreferrer">Podgląd i kod QR</a><AppButton type="button" className="ml-2" onClick={async () => { try { await navigator.clipboard.writeText(new URL(href, window.location.origin).href); setError(""); } catch { setError("Nie udało się skopiować. Otwórz podgląd i skopiuj adres."); } }}>Kopiuj link dla klienta</AppButton></div>}
  </form>;
}
