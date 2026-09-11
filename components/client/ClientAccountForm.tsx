"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";
const oauthMessages: Record<string, string> = {
  oauth_session: "Sesja logowania wygasła. Spróbuj ponownie w jednej karcie przeglądarki.",
  oauth_exchange: "Nie udało się dokończyć połączenia z Google. Spróbuj ponownie za chwilę.",
  oauth_profile: "Nie udało się pobrać danych konta Google. Spróbuj ponownie.",
  oauth_database: "Konto Google zostało potwierdzone, ale zapis profilu jest chwilowo niedostępny. Spróbuj ponownie za moment.",
};

export default function ClientAccountForm({ oauthError, returnTo = "/app/portal" }: { oauthError?: string; returnTo?: string }) {
  const [mode, setMode] = useState<Mode>("login"); const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  const [error, setError] = useState(oauthError ? (oauthMessages[oauthError] ?? "Nie udało się dokończyć logowania przez Google.") : "");
  const router = useRouter();

  function choose(next: Mode) { setMode(next); setRecovering(false); setError(""); setMessage(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const endpoint = recovering ? "recover" : mode;
      const response = await fetch(`/api/client/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Nie udało się wykonać tej operacji.");
      if (recovering) { setMessage(result.message); return; }
      if (result.needsEmailConfirmation) { setMessage("Sprawdź skrzynkę e-mail i potwierdź adres. Potem zaloguj się tutaj."); return; }
      router.push(returnTo); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Wystąpił nieoczekiwany błąd."); }
    finally { setLoading(false); }
  }

  return <section className="w-full max-w-md border border-ink-white/15 bg-ink-charcoal/40 p-6 md:p-8">
    <div className="grid grid-cols-2 border border-ink-white/15 text-xs tracking-[.1em]"><button type="button" onClick={() => choose("login")} className={mode === "login" && !recovering ? "bg-ink-gold px-3 py-3 text-ink-black" : "px-3 py-3 text-ink-grey hover:text-ink-white"}>ZALOGUJ SIĘ</button><button type="button" onClick={() => choose("register")} className={mode === "register" && !recovering ? "bg-ink-gold px-3 py-3 text-ink-black" : "px-3 py-3 text-ink-grey hover:text-ink-white"}>ZAŁÓŻ KONTO</button></div>
    {recovering && <div className="mt-5 border-l-2 border-ink-gold pl-4"><p className="text-sm text-ink-white">Odzyskiwanie dostępu</p><p className="mt-1 text-xs leading-relaxed text-ink-grey">Podaj e-mail konta. Otrzymasz jednorazowy link do ustawienia nowego hasła.</p></div>}
    <form className="mt-7 space-y-4" onSubmit={submit}>
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label>Nie wypełniaj<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {mode === "register" && !recovering && <><div className="grid gap-4 sm:grid-cols-2"><Input name="firstName" label="Imię" autoComplete="given-name" /><Input name="lastName" label="Nazwisko" autoComplete="family-name" /></div><p className="border-l-2 border-ink-gold/60 pl-3 text-[11px] leading-relaxed text-ink-grey">Podaj pełne imię i nazwisko. Dane weryfikuje wyłącznie studio w celu umówienia wizyty — nie zobaczą ich inni klienci i nie będą publiczne.</p></>}
      <Input name="email" label="E-mail" type="email" autoComplete="email" />
      {!recovering && <Input name="password" label="Hasło" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} hint={mode === "register" ? "Minimum 12 znaków." : undefined} />}
      {mode === "register" && !recovering && <label className="flex items-start gap-2 text-xs leading-relaxed text-ink-grey"><input required name="privacyAcknowledged" type="checkbox" className="mt-1" /><span>Potwierdzam, że zapoznałem(-am) się z <Link className="text-ink-gold underline" href="/polityka-prywatnosci">Polityką prywatności i informacją RODO</Link>.</span></label>}
      {error && <p role="alert" className="border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="border border-ink-gold/40 bg-ink-gold/5 px-3 py-2 text-sm text-ink-grey">{message}</p>}
      <button disabled={loading} className="w-full border border-ink-gold bg-ink-gold px-5 py-3 text-xs font-medium tracking-[.1em] text-ink-black disabled:opacity-50">{loading ? "CHWILA…" : recovering ? "WYŚLIJ LINK" : mode === "login" ? "WEJDŹ DO KONTA" : "UTWÓRZ BEZPIECZNE KONTO"}</button>
      {mode === "login" && <button type="button" onClick={() => { setRecovering((value) => !value); setError(""); setMessage(""); }} className="w-full py-2 text-xs text-ink-grey underline hover:text-ink-gold">{recovering ? "Wróć do logowania" : "Nie pamiętam hasła"}</button>}
    </form>
    {!recovering && <div className="mt-6 border-t border-ink-white/15 pt-5"><p className="text-center text-[10px] tracking-[.12em] text-ink-grey">LUB KONTYNUUJ PRZEZ</p><div className="mt-3"><a href={`/api/client/auth/oauth?provider=google&returnTo=${encodeURIComponent(returnTo)}`} aria-label="Zaloguj się przez Google" title="Zaloguj się przez Google" className="flex h-11 items-center justify-center border border-ink-white/20 text-ink-white hover:border-ink-gold"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.52h3.14c1.84-1.69 2.91-4.18 2.91-7.29Z"/><path fill="#34A853" d="M12 21.78c2.63 0 4.84-.87 6.45-2.36l-3.14-2.52c-.87.58-1.99.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.6A9.75 9.75 0 0 0 2.25 12c0 1.58.38 3.08 1.04 4.39l3.24-2.6Z"/><path fill="#EA4335" d="M12 6.18c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.27 14.63 2.22 12 2.22a9.75 9.75 0 0 0-8.71 5.39l3.24 2.6C7.3 7.9 9.46 6.18 12 6.18Z"/></svg></a></div></div>}
    <p className="mt-5 text-center text-xs leading-relaxed text-ink-grey">Konto pozwala śledzić projekty, wizyty, dokumenty, wiadomości, powiadomienia i przesłane inspiracje.</p>
  </section>;
}

function Input({ name, label, type = "text", autoComplete, hint }: { name: string; label: string; type?: string; autoComplete?: string; hint?: string }) {
  return <label className="flex flex-col gap-2 text-[11px] tracking-[.1em] text-ink-grey">{label.toUpperCase()}<input required name={name} type={type} autoComplete={autoComplete} minLength={name === "password" ? 12 : undefined} maxLength={name === "password" ? 128 : undefined} className="border border-ink-white/20 bg-transparent px-3 py-3 text-sm normal-case tracking-normal text-ink-white outline-none focus:border-ink-gold" />{hint && <span className="normal-case tracking-normal text-ink-grey/75">{hint}</span>}</label>;
}
