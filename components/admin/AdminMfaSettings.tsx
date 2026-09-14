"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = { enabled: boolean; setupPending: boolean; recoveryCodesLeft: number };

export default function AdminMfaSettings() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/mfa", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/mfa", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setStatus(await response.json());
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function action(actionName: "setup" | "enable" | "disable" | "regenerate") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, code, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nie udało się zmienić MFA.");
      if (data.secret) { setSecret(data.secret); setUri(data.otpAuthUri); }
      if (data.recoveryCodes) setRecoveryCodes(data.recoveryCodes);
      setCode(""); setPassword("");
      if (data.signedOut) { router.replace("/admin/login"); router.refresh(); return; }
      await load();
      setMessage(actionName === "setup" ? "Dodaj konto w aplikacji uwierzytelniającej i potwierdź kodem." : "Zapisano.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Błąd MFA."); }
    finally { setBusy(false); }
  }

  return <div className="max-w-2xl text-sm">
    <p className="text-ink-grey">Kod z aplikacji uwierzytelniającej chroni panel także po wycieku hasła.</p>
    {!status?.enabled && !secret && <button type="button" disabled={busy} onClick={() => action("setup")} className="mt-4 border border-ink-gold px-4 py-3 text-xs text-ink-gold">SKONFIGURUJ MFA</button>}
    {secret && <div className="mt-4 space-y-3 border border-ink-white/15 p-4">
      <p>W aplikacji Google/Microsoft Authenticator wybierz ręczne dodanie klucza.</p>
      <code className="block break-all bg-black/40 p-3 tracking-[.12em] text-ink-gold">{secret}</code>
      <details><summary className="cursor-pointer text-xs text-ink-grey">Adres konfiguracyjny</summary><code className="mt-2 block break-all text-xs text-ink-grey">{uri}</code></details>
      <label className="block text-xs text-ink-grey">KOD 6-CYFROWY<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" className="mt-2 block w-full border border-white/20 bg-transparent px-3 py-2 text-white" /></label>
      <button type="button" disabled={busy || !code} onClick={() => action("enable")} className="border border-emerald-400 px-4 py-3 text-xs text-emerald-300">WŁĄCZ I WYLOGUJ SESJE</button>
    </div>}
    {status?.enabled && <div className="mt-4 space-y-3 border border-emerald-400/30 p-4">
      <p className="text-emerald-300">MFA włączone · kody awaryjne: {status.recoveryCodesLeft}</p>
      <label className="block text-xs text-ink-grey">KOD MFA<input value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 block w-full border border-white/20 bg-transparent px-3 py-2 text-white" /></label>
      <button type="button" disabled={busy || !code} onClick={() => action("regenerate")} className="border border-ink-gold px-4 py-2 text-xs text-ink-gold">NOWE KODY AWARYJNE</button>
      <label className="block text-xs text-ink-grey">HASŁO — TYLKO PRZY WYŁĄCZANIU<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full border border-white/20 bg-transparent px-3 py-2 text-white" /></label>
      <button type="button" disabled={busy || !code || !password} onClick={() => action("disable")} className="border border-red-400 px-4 py-2 text-xs text-red-300">WYŁĄCZ MFA</button>
    </div>}
    {recoveryCodes.length > 0 && <div className="mt-4 border border-amber-400/40 bg-amber-400/5 p-4"><p className="font-medium text-amber-200">Zapisz teraz. Każdy kod działa tylko raz.</p><pre className="mt-3 grid grid-cols-2 gap-2 whitespace-pre-wrap text-ink-white">{recoveryCodes.join("\n")}</pre></div>}
    {message && <p role="status" className="mt-3 text-xs text-ink-grey">{message}</p>}
  </div>;
}
