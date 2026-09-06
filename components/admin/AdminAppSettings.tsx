"use client";

import { useEffect, useState } from "react";
import { BellRing, Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function applicationServerKey(value: string) {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
}

export default function AdminAppSettings() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const statusTimer = window.setTimeout(() => setInstalled(window.matchMedia("(display-mode: standalone)").matches), 0);
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const done = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
      navigator.serviceWorker.ready.then(async (registration) => {
        setSupported(true);
        const [subscription, config] = await Promise.all([
          registration.pushManager.getSubscription(),
          fetch("/api/admin/push", { cache: "no-store" }).then((response) => response.json()),
        ]);
        setEnabled(Boolean(subscription && Array.isArray(config.endpoints) && config.endpoints.includes(subscription.endpoint)));
      }).catch(() => undefined);
    }
    return () => { window.clearTimeout(statusTimer); window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  async function togglePush() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (enabled && existing) {
        const response = await fetch("/api/admin/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        if (!response.ok) throw new Error("Nie udało się wyłączyć powiadomień.");
        await existing.unsubscribe();
        setEnabled(false); setMessage("Powiadomienia administratora wyłączono na tym urządzeniu.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Przeglądarka nie otrzymała zgody na powiadomienia.");
      const config = await fetch("/api/admin/push", { cache: "no-store" }).then((response) => response.json());
      if (!config.publicKey) throw new Error("Powiadomienia są chwilowo niedostępne.");
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      const saved = await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!saved.ok) throw new Error("Nie udało się zapisać powiadomień administratora.");
      setEnabled(true); setMessage("Gotowe — powiadomienia od klientów trafią na to urządzenie.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zmienić ustawienia.");
    } finally { setBusy(false); }
  }

  return <section className="border border-ink-white/10 bg-ink-charcoal/30 p-5 sm:p-6"><div className="flex items-start gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-ink-gold" /><div><p className="text-[10px] tracking-[.14em] text-ink-gold">APLIKACJA ADMINA</p><h2 className="mt-1 font-display text-2xl">Studio pod ręką</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-grey">Zainstaluj panel jako osobną aplikację i otrzymuj powiadomienia, gdy klient wyśle wiadomość, doda inspirację, zarezerwuje lub anuluje termin.</p></div></div><div className="mt-5 flex flex-wrap gap-2">{installPrompt && !installed && <button type="button" onClick={install} className="inline-flex items-center gap-2 border border-ink-gold bg-ink-gold px-4 py-3 text-xs text-ink-black"><Download className="h-4 w-4" />ZAINSTALUJ PANEL</button>}{installed && <span className="inline-flex items-center gap-2 border border-emerald-400/40 px-4 py-3 text-xs text-emerald-300">✓ PANEL ZAINSTALOWANY</span>}{supported ? <button type="button" disabled={busy} onClick={togglePush} className={`inline-flex items-center gap-2 border px-4 py-3 text-xs ${enabled ? "border-red-400/50 text-red-200" : "border-ink-gold text-ink-gold"}`}><BellRing className="h-4 w-4" />{busy ? "CHWILA…" : enabled ? "WYŁĄCZ PUSH" : "WŁĄCZ PUSH OD KLIENTÓW"}</button> : <span className="text-xs text-ink-grey">Ta przeglądarka nie obsługuje push.</span>}</div>{!installPrompt && !installed && <p className="mt-4 text-xs text-ink-grey">iPhone/iPad: Safari → Udostępnij → „Do ekranu początkowego”. Na komputerze opcja instalacji jest dostępna w pasku adresu.</p>}{message && <p role="status" className="mt-3 text-xs text-ink-grey">{message}</p>}</section>;
}
