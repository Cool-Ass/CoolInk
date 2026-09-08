"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function InstallAppCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null); const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", capture); window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); };
  }, []);
  async function install() { if (!prompt) return; await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === "accepted") setInstalled(true); setPrompt(null); }
  return <section className="border border-ink-white/10 bg-ink-charcoal/30 p-4"><p className="text-[10px] tracking-[.14em] text-ink-gold">APLIKACJA COOLINK</p><h2 className="mt-1 font-display text-xl">Miej konto pod ręką</h2><p className="mt-2 text-xs leading-relaxed text-ink-grey">Zainstaluj konto na ekranie telefonu i otwieraj je jak aplikację.</p>{prompt && !installed && <button type="button" onClick={install} className="mt-3 border border-ink-gold bg-ink-gold px-3 py-2 text-[10px] text-ink-black">ZAINSTALUJ APLIKACJĘ</button>}{installed && <p role="status" className="mt-3 text-xs text-ink-gold">Aplikacja jest zainstalowana.</p>}<p className="mt-3 text-[10px] leading-relaxed text-ink-grey">iPhone/iPad: Udostępnij → „Do ekranu początkowego”.</p></section>;
}
