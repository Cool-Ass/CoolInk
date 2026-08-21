"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Panel główny", exact: true },
  { href: "/admin/clients", label: "Klienci / CRM" },
  { href: "/admin/calendar", label: "Kalendarz wizyt" },
  { href: "/admin/documents", label: "Dokumenty i zgody" },
  { href: "/admin/pages", label: "Strony" },
  { href: "/admin/portfolio", label: "Portfolio / Galeria" },
  { href: "/admin/media", label: "Obrazy / Media" },
  { href: "/admin/messages", label: "Wiadomości" },
  { href: "/admin/content", label: "Treści globalne" },
  { href: "/admin/navigation", label: "Nawigacja" },
  { href: "/admin/settings", label: "Ustawienia" },
];

export default function Sidebar({
  logoUrl = "/images/logo-white.jpg",
}: {
  logoUrl?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-white/10 bg-ink-charcoal/40 md:flex">
      <div className="flex items-center gap-2 border-b border-ink-white/10 px-6 py-6">
        <div className="relative h-9 w-28">
          <Image
            src={logoUrl}
            alt="CoolInk"
            fill
            className="object-contain mix-blend-screen"
            sizes="112px"
          />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2.5 text-[13px] tracking-[0.03em] transition-colors ${
                active
                  ? "border-l-2 border-ink-gold bg-ink-gold/10 text-ink-gold"
                  : "border-l-2 border-transparent text-ink-grey hover:text-ink-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-white/10 px-6 py-5">
        <Link
          href="/"
          target="_blank"
          className="text-[12px] tracking-[0.1em] text-ink-grey transition-colors hover:text-ink-gold"
        >
          ↗ ZOBACZ STRONĘ
        </Link>
      </div>
    </aside>
  );
}
