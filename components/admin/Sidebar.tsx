"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export const ADMIN_SECTIONS = [
  {
    label: "STUDIO",
    links: [
      { href: "/admin", label: "Dziś", exact: true },
      { href: "/admin/calendar", label: "Kalendarz" },
      { href: "/admin/clients", label: "Klienci" },
      { href: "/admin/messages", label: "Wiadomości" },
    ],
  },
  {
    label: "STRONA / CMS",
    links: [
      { href: "/admin/pages", label: "Strony i builder" },
      { href: "/admin/portfolio", label: "Portfolio / Galeria" },
      { href: "/admin/media", label: "Obrazy / Media" },
      { href: "/admin/content", label: "Treści globalne" },
      { href: "/admin/navigation", label: "Nawigacja" },
    ],
  },
  { label: "OBSŁUGA", links: [{ href: "/admin/documents", label: "Dokumenty" }] },
  {
    label: "USTAWIENIA",
    links: [{ href: "/admin/settings", label: "Ustawienia ogólne" }],
  },
] as const;

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

      <nav className="flex flex-1 flex-col gap-6 px-3 py-6">
        {ADMIN_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-ink-grey/70">
              {section.label}
            </p>
            <div className="flex flex-col gap-1">
              {section.links.map((link) => {
                const active = ("exact" in link && link.exact)
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
            </div>
          </div>
        ))}
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
