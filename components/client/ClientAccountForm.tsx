"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function ClientAccountForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/client/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Nie udało się wykonać tej operacji.");
      if (result.needsEmailConfirmation) { setMessage("Sprawdź skrzynkę e-mail i potwierdź adres. Potem zaloguj się tutaj."); return; }
      router.push("/app/portal"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Wystąpił nieoczekiwany błąd."); }
    finally { setLoading(false); }
  }

  return <section className="w-full max-w-md border border-ink-white/15 bg-ink-charcoal/40 p-6 md:p-8">
    <div className="grid grid-cols-2 border border-ink-white/15 text-xs tracking-[0.1em]">
      <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={mode === "login" ? "bg-ink-gold px-3 py-3 text-ink-black" : "px-3 py-3 text-ink-grey hover:text-ink-white"}>ZALOGUJ SIĘ</button>
      <button type="button" onClick={() => { setMode("register"); setError(""); setMessage(""); }} className={mode === "register" ? "bg-ink-gold px-3 py-3 text-ink-black" : "px-3 py-3 text-ink-grey hover:text-ink-white"}>ZAŁÓŻ KONTO</button>
    </div>
    <form className="mt-7 space-y-4" onSubmit={submit}>
      {mode === "register" && <div className="grid gap-4 sm:grid-cols-2"><Input name="firstName" label="Imię" autoComplete="given-name" /><Input name="lastName" label="Nazwisko" autoComplete="family-name" /></div>}
      <Input name="email" label="E-mail" type="email" autoComplete="email" />
      <Input name="password" label="Hasło" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} hint={mode === "register" ? "Minimum 8 znaków." : undefined} />
      {error && <p role="alert" className="border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {message && <p className="border border-ink-gold/40 bg-ink-gold/5 px-3 py-2 text-sm text-ink-grey">{message}</p>}
      <button disabled={loading} className="w-full border border-ink-gold bg-ink-gold px-5 py-3 text-xs font-medium tracking-[0.1em] text-ink-black disabled:opacity-50">{loading ? "CHWILA…" : mode === "login" ? "WEJDŹ DO KONTA" : "UTWÓRZ BEZPIECZNE KONTO"}</button>
    </form>
    <p className="mt-5 text-center text-xs leading-relaxed text-ink-grey">Konto pozwala śledzić projekty, wizyty i przesłane inspiracje.</p>
  </section>;
}

function Input({ name, label, type = "text", autoComplete, hint }: { name: string; label: string; type?: string; autoComplete?: string; hint?: string }) {
  return <label className="flex flex-col gap-2 text-[11px] tracking-[0.1em] text-ink-grey">{label.toUpperCase()}<input required name={name} type={type} autoComplete={autoComplete} minLength={name === "password" ? 8 : undefined} className="border border-ink-white/20 bg-transparent px-3 py-3 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" />{hint && <span className="normal-case tracking-normal text-ink-grey/75">{hint}</span>}</label>;
}
