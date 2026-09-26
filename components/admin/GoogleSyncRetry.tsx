"use client";
import { useEffect, useState } from "react";
export default function GoogleSyncRetry() {
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch("/api/admin/google-calendar/retry");
    if (!response.ok) throw new Error("Nie udało się pobrać kolejki synchronizacji.");
    setPending((await response.json()).pending);
  }
  useEffect(() => { void load().catch(() => setError("Nie udało się pobrać kolejki synchronizacji.")); }, []);
  return <div className="mt-3 text-sm"><p role="status">{pending === null ? "Sprawdzanie kolejki Google…" : `Oczekujące synchronizacje Google: ${pending}`}</p>{Boolean(pending) && <button type="button" disabled={busy} className="mt-2 text-ink-gold underline" onClick={async () => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/google-calendar/retry", { method: "POST" }); if (!response.ok) throw new Error(); await load(); }
    catch { setError("Ponowienie nie powiodło się. Sprawdź połączenie Google."); } finally { setBusy(false); }
  }}>{busy ? "Synchronizacja…" : "Ponów oczekujące synchronizacje"}</button>}{error && <p role="alert">{error}</p>}</div>;
}
