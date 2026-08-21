"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Topbar({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-ink-white/10 bg-ink-black/60 px-6 py-4 md:px-10">
      <p className="text-[13px] tracking-[0.05em] text-ink-grey">
        Zalogowano jako <span className="text-ink-white">{adminEmail}</span>
      </p>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="border border-ink-white/20 px-4 py-2 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-50"
      >
        {loggingOut ? "WYLOGOWYWANIE…" : "WYLOGUJ"}
      </button>
    </header>
  );
}
