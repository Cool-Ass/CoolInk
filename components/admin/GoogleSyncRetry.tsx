"use client";
import { useEffect, useState } from "react";
type QueueStatus = { pending: number; failed: number; conflicts: number; configuration: number; oldestQueuedAt: string | null };
export default function GoogleSyncRetry() {
  const [queue, setQueue] = useState<QueueStatus | null>(null);
  const pending = queue?.pending ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch("/api/admin/google-calendar/retry");
    if (!response.ok) throw new Error("Nie udało się pobrać kolejki synchronizacji.");
    setQueue(await response.json());
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/google-calendar/retry", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { if (!controller.signal.aborted) setQueue(data); })
      .catch(() => { if (!controller.signal.aborted) setError("Nie udało się pobrać kolejki synchronizacji."); });
    return () => controller.abort();
  }, []);
  return <div className="mt-3 text-sm"><p role="status">{pending === null ? "Sprawdzanie kolejki Google…" : `Oczekujące synchronizacje Google: ${pending}`}</p>
    {queue?.oldestQueuedAt && <p className="text-ink-muted">Najstarsza oczekuje od {new Date(queue.oldestQueuedAt).toLocaleString("pl-PL")}. Ponowienia respektują odstęp po błędzie.</p>}
    {Boolean(queue?.configuration) && <p role="status">Wymagają konfiguracji połączenia: {queue?.configuration}.</p>}
    {Boolean(queue?.conflicts) && <p role="status">Konflikty wymagające sprawdzenia zmian w Google: {queue?.conflicts}.</p>}
    {Boolean(queue?.failed) && <p role="status">Błędy eksportu oczekujące na ponowienie: {queue?.failed}.</p>}
    {Boolean(pending) && <button type="button" disabled={busy} className="mt-2 text-ink-gold underline" onClick={async () => {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/google-calendar/retry", { method: "POST" }); if (!response.ok) throw new Error(); await load(); }
    catch { setError("Ponowienie nie powiodło się. Sprawdź połączenie Google."); } finally { setBusy(false); }
  }}>{busy ? "Synchronizacja…" : "Ponów oczekujące synchronizacje"}</button>}{error && <p role="alert">{error}</p>}</div>;
}
