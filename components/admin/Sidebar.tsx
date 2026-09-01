"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, Globe2, Image as ImageIcon, LayoutDashboard, LibraryBig, PanelsTopLeft, Settings, Users } from "lucide-react";
import { imageSource } from "@/lib/imageSource";

export const ADMIN_SECTIONS = [
  {
    label: "STUDIO",
    links: [
      { href: "/admin", label: "Dziś", icon: LayoutDashboard, exact: true },
      { href: "/admin/calendar", label: "Kalendarz", icon: CalendarDays },
      { href: "/admin/clients", label: "Klienci", icon: Users },
    ],
  },
  {
    label: "STRONA / CMS",
    links: [
      { href: "/admin/pages", label: "Strony i builder", icon: PanelsTopLeft },
      { href: "/admin/portfolio", label: "Portfolio / Galeria", icon: ImageIcon },
      { href: "/admin/media", label: "Biblioteka mediów", icon: LibraryBig },
      { href: "/admin/content", label: "Treści globalne", icon: Globe2 },
      { href: "/admin/navigation", label: "Nawigacja", icon: Globe2 },
    ],
  },
  { label: "OBSŁUGA", links: [{ href: "/admin/documents", label: "Dokumenty", icon: FileText }] },
  {
    label: "USTAWIENIA",
    links: [{ href: "/admin/settings", label: "Ustawienia ogólne", icon: Settings }],
  },
] as const;

export default function Sidebar({
  logoUrl = "/images/logo-white.jpg",
}: {
  logoUrl?: string;
}) {
  const pathname = usePathname();
  const logoSource = imageSource(logoUrl);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-white/10 bg-ink-charcoal/40 md:flex">
      <div className="flex items-center gap-2 border-b border-ink-white/10 px-6 py-6">
        <div className="relative h-9 w-28">
          {logoSource ? <Image src={logoSource} alt="CoolInk" fill className="object-contain mix-blend-screen" sizes="112px" /> : <span className="flex h-full items-center font-display text-base tracking-[0.08em] text-ink-white">COOLINK</span>}
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
                const Icon = link.icon;
                const active = ("exact" in link && link.exact)
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[13px] tracking-[0.03em] transition-colors ${
                      active
                        ? "border-l-2 border-ink-gold bg-ink-gold/10 text-ink-gold"
                        : "border-l-2 border-transparent text-ink-grey hover:text-ink-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />{link.label}
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
