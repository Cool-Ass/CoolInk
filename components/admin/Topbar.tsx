"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_SECTIONS } from "@/components/admin/Sidebar";

export default function Topbar({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header className="relative flex items-center justify-between border-b border-ink-white/10 bg-ink-black/60 px-6 py-4 md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Otwórz nawigację administratora" className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-white/20 text-lg text-ink-white hover:border-ink-gold hover:text-ink-gold md:hidden">☰</button>
        {pathname !== "/admin" && <Link href="/admin" aria-label="Wróć do panelu głównego" className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink-white/20 text-lg text-ink-white hover:border-ink-gold hover:text-ink-gold md:hidden">←</Link>}
        <p className="truncate text-[13px] tracking-[0.05em] text-ink-grey">
          <span className="md:hidden">PANEL ADMINA</span><span className="hidden md:inline">Zalogowano jako <span className="text-ink-white">{adminEmail}</span></span>
        </p>
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="border border-ink-white/20 px-4 py-2 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-50"
      >
        {loggingOut ? "WYLOGOWYWANIE…" : "WYLOGUJ"}
      </button>
      {menuOpen && <nav aria-label="Nawigacja administratora" className="absolute inset-x-0 top-full z-50 border-b border-ink-white/15 bg-ink-charcoal p-4 shadow-2xl md:hidden">{ADMIN_SECTIONS.map((section) => <div key={section.label} className="mb-4 last:mb-0"><p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-ink-grey">{section.label}</p><div className="grid grid-cols-2 gap-2">{section.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`border px-3 py-3 text-xs ${pathname === link.href || (!("exact" in link && link.exact) && pathname.startsWith(link.href)) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{link.label}</Link>)}</div></div>)}</nav>}
    </header>
  );
}
