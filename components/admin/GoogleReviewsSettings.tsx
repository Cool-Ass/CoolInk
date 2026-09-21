"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GoogleReviewsSettings({ initial }: { initial: { placeId: string; mapsUrl: string; configured: boolean } }) {
  const router = useRouter();
  const [values, setValues] = useState({ placeId: initial.placeId, mapsUrl: initial.mapsUrl, apiKey: "", removeKey: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/settings/google-reviews", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się zapisać.");
      setValues((current) => ({ ...current, apiKey: "", removeKey: false }));
      setMessage("Zapisano konfigurację."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Błąd połączenia."); }
    finally { setBusy(false); }
  }}>
    <p className="text-xs text-ink-grey">Places API (New). Klucz pozostaje na serwerze. Puste pole zachowuje zapisany klucz. {initial.configured ? "Klucz jest skonfigurowany." : "Brak klucza API."}</p>
    {([["placeId", "Place ID wizytówki"], ["mapsUrl", "Link do wizytówki Google"], ["apiKey", "Klucz Google Places API"]] as const).map(([key, label]) => <label key={key} className="block text-xs">{label}<input type={key === "apiKey" ? "password" : key === "mapsUrl" ? "url" : "text"} autoComplete={key === "apiKey" ? "new-password" : "off"} maxLength={key === "mapsUrl" ? 2000 : key === "apiKey" ? 512 : 255} value={values[key]} disabled={busy} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className="mt-1 block w-full rounded border border-ink-white/20 bg-ink-black p-2" /></label>)}
    <p className="text-xs text-ink-grey">Ogranicz klucz do Places API. Sprawdź rozliczenia i limity w Google Cloud. Widget pokazuje opinie zwrócone przez Google, nie pełną historię.</p>
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={values.removeKey} disabled={busy || Boolean(values.apiKey)} onChange={(event) => setValues({ ...values, removeKey: event.target.checked })} />Usuń zapisany klucz (klucz ze środowiska serwera, jeśli istnieje, pozostanie aktywny).</label>
    <button disabled={busy} className="studio-primary-link disabled:opacity-40">{busy ? "Zapisywanie…" : "Zapisz konfigurację"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
