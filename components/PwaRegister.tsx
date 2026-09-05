"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }>; }

export default function PwaRegister() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  if (!prompt) return null;
  return <button type="button" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }} className="fixed bottom-4 right-4 z-[60] border border-ink-gold bg-ink-black/95 px-4 py-3 text-[11px] tracking-[.08em] text-ink-gold shadow-2xl backdrop-blur md:bottom-6 md:right-6">ZAINSTALUJ APLIKACJĘ</button>;
}
