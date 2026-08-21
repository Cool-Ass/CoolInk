"use client";

import Image from "next/image";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginFormInner({ logoUrl }: { logoUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Logowanie nie powiodło się.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logowanie nie powiodło się.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-black px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="relative h-16 w-48">
            <Image
              src={logoUrl}
              alt="CoolInk Tattoo Studio — logo"
              fill
              priority
              className="object-contain mix-blend-screen"
              sizes="192px"
            />
          </div>
        </div>

        <div className="border border-ink-white/15 bg-ink-charcoal/60 p-8 backdrop-blur-sm">
          <p className="mb-1 text-[13px] font-medium tracking-[0.3em] text-ink-gold">
            PANEL ADMINISTRACYJNY
          </p>
          <h1 className="mb-6 font-display text-2xl text-ink-white">Zaloguj się</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
              EMAIL
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
                placeholder="admin@coolink-tattoo.pl"
              />
            </label>

            <label className="flex flex-col gap-2 text-[12px] tracking-[0.12em] text-ink-grey">
              HASŁO
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-ink-white/20 bg-transparent px-4 py-3 text-[14px] text-ink-white outline-none transition-colors focus:border-ink-gold"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-3 border border-ink-gold px-6 py-3.5 text-[13px] font-medium tracking-[0.08em] text-ink-gold transition-colors hover:bg-ink-gold hover:text-ink-black disabled:opacity-50"
            >
              {loading ? "LOGOWANIE…" : "ZALOGUJ SIĘ"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12px] text-ink-grey/70">
          Dane logowania konfiguruje się przez zmienne środowiskowe — zobacz .env.example.
        </p>
      </div>
    </div>
  );
}

export default function LoginForm({ logoUrl }: { logoUrl: string }) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner logoUrl={logoUrl} />
    </Suspense>
  );
}
