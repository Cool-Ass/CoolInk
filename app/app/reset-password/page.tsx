"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? ""); const confirm = String(form.get("confirm") ?? "");
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token") ?? "";
    try {
      if (password !== confirm) throw new Error("Hasła nie są takie same.");
      const response = await fetch("/api/client/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken, password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      history.replaceState(null, "", location.pathname); setMessage("Hasło zostało zmienione. Możesz się teraz zalogować."); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się zmienić hasła."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-ink-black px-6 text-ink-white"><section className="w-full max-w-md border border-ink-white/15 bg-ink-charcoal/40 p-7"><p className="text-[11px] tracking-[.18em] text-ink-gold">BEZPIECZEŃSTWO KONTA</p><h1 className="mt-3 font-display text-4xl">Ustaw nowe hasło</h1><p className="mt-3 text-sm leading-relaxed text-ink-grey">Wprowadź nowe hasło o długości co najmniej 12 znaków. Link z wiadomości jest jednorazowy i wygasa.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs text-ink-grey">NOWE HASŁO<input required name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 w-full border border-ink-white/25 bg-ink-black px-3 py-3 text-ink-white" /></label><label className="block text-xs text-ink-grey">POWTÓRZ HASŁO<input required name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" className="mt-2 w-full border border-ink-white/25 bg-ink-black px-3 py-3 text-ink-white" /></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{message && <p role="status" className="text-sm text-ink-gold">{message}</p>}<button disabled={busy} className="w-full border border-ink-gold bg-ink-gold px-4 py-3 text-xs text-ink-black">{busy ? "ZAPISYWANIE…" : "ZMIEŃ HASŁO"}</button></form><Link href="/app" className="mt-5 inline-block text-xs text-ink-gold">← WRÓĆ DO LOGOWANIA</Link></section></main>;
}
