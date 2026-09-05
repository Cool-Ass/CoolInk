"use client";

import { useEffect, useState } from "react";

function applicationServerKey(value: string) {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
}

export default function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    navigator.serviceWorker.ready.then((registration) => { setSupported(true); return registration.pushManager.getSubscription(); }).then((subscription) => setEnabled(Boolean(subscription))).catch(() => undefined);
  }, []);
  async function toggle() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/client/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe(); setEnabled(false); setMessage("Powiadomienia zostały wyłączone na tym urządzeniu."); return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Przeglądarka nie otrzymała zgody na powiadomienia.");
      const config = await fetch("/api/client/push", { cache: "no-store" }).then((response) => response.json());
      if (!config.publicKey) throw new Error("Powiadomienia są chwilowo niedostępne.");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      const saved = await fetch("/api/client/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!saved.ok) { await subscription.unsubscribe(); throw new Error("Nie udało się zapisać ustawienia."); }
      setEnabled(true); setMessage("Włączone — przypomnienia o wizytach pojawią się także na tym urządzeniu.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zmienić ustawienia."); }
    finally { setBusy(false); }
  }
  return <section className="mt-5 border border-ink-white/15 bg-ink-charcoal/30 p-5"><p className="text-[10px] tracking-[.14em] text-ink-gold">POWIADOMIENIA PUSH</p><h2 className="mt-2 font-display text-2xl">Przypomnienia na telefonie</h2><p className="mt-2 text-sm leading-relaxed text-ink-grey">Otrzymuj informacje o zmianach projektu oraz przypomnienie przed potwierdzoną wizytą. Zgodę możesz wycofać w każdej chwili.</p>{supported ? <button type="button" disabled={busy} onClick={toggle} className={`mt-4 border px-4 py-3 text-xs tracking-[.08em] ${enabled ? "border-red-400/50 text-red-200" : "border-ink-gold text-ink-gold"}`}>{busy ? "CHWILA…" : enabled ? "WYŁĄCZ NA TYM URZĄDZENIU" : "WŁĄCZ POWIADOMIENIA"}</button> : <p className="mt-4 text-xs text-ink-grey">Ta przeglądarka nie obsługuje powiadomień push. Nadal zobaczysz wszystkie informacje w koncie.</p>}{message && <p role="status" className="mt-3 text-xs text-ink-grey">{message}</p>}</section>;
}
