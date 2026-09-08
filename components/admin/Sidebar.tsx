"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, CalendarDays, FileText, Image as ImageIcon, LayoutDashboard, LibraryBig, MessageSquare, PackageOpen, PanelsTopLeft, Settings, Users } from "lucide-react";
import { imageSource } from "@/lib/imageSource";
import { normalizeAdminRole, type AdminRole } from "@/lib/adminPermissions";

export const ADMIN_SECTIONS = [
  {
    label: "STUDIO",
    links: [
      { href: "/admin", label: "Dziś", icon: LayoutDashboard, exact: true },
      { href: "/admin/calendar", label: "Kalendarz", icon: CalendarDays },
      { href: "/admin/waitlist", label: "Lista rezerwowa", icon: CalendarClock },
      { href: "/admin/clients", label: "Klienci", icon: Users },
      { href: "/admin/messages", label: "Wiadomości", icon: MessageSquare },
      { href: "/admin/statistics", label: "Statystyki", icon: BarChart3, roles: ["owner", "manager"] },
      { href: "/admin/inventory", label: "Magazyn", icon: PackageOpen, roles: ["owner", "manager"] },
    ],
  },
  {
    label: "STRONA / CMS",
    links: [
      { href: "/admin/pages", label: "Strony i builder", icon: PanelsTopLeft, roles: ["owner", "manager"] },
      { href: "/admin/portfolio", label: "Portfolio / Galeria", icon: ImageIcon, roles: ["owner", "manager"] },
      { href: "/admin/media", label: "Biblioteka mediów", icon: LibraryBig, roles: ["owner", "manager"] },
    ],
  },
  { label: "OBSŁUGA", links: [{ href: "/admin/documents", label: "Dokumenty", icon: FileText }] },
  {
    label: "USTAWIENIA",
    links: [{ href: "/admin/settings", label: "Ustawienia ogólne", icon: Settings, roles: ["owner"] }],
  },
] as const;

export function getAdminSections(role: string) {
  const normalized = normalizeAdminRole(role);
  return ADMIN_SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => !("roles" in link) || (link.roles as readonly AdminRole[]).includes(normalized)),
  })).filter((section) => section.links.length > 0);
}

export default function Sidebar({
  logoUrl = "/images/logo-white.jpg",
  role = "owner",
}: {
  logoUrl?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const logoSource = imageSource(logoUrl);
  const sections = getAdminSections(role);

  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-ink-white/10 bg-ink-charcoal/55 shadow-[12px_0_40px_rgba(0,0,0,.16)] backdrop-blur md:flex">
      <div className="flex items-center gap-2 border-b border-ink-white/10 px-5 py-4">
        <div className="relative h-8 w-24">
          {logoSource ? <Image src={logoSource} alt="CoolInk" fill className="object-contain mix-blend-screen" sizes="112px" /> : <span className="flex h-full items-center font-display text-base tracking-[0.08em] text-ink-white">COOLINK</span>}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1.5 text-[9px] font-semibold tracking-[0.18em] text-ink-grey/60">
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
                    className={`flex min-h-9 items-center gap-2.5 px-3 py-2 text-[12px] tracking-[0.02em] transition-colors ${
                      active
                        ? "border-l-2 border-ink-gold bg-ink-gold/10 text-ink-gold"
                        : "border-l-2 border-transparent text-ink-grey hover:text-ink-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />{link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-ink-white/10 px-5 py-3.5">
        <Link
          href="/"
          target="_blank"
          className="text-[10px] tracking-[0.1em] text-ink-grey transition-colors hover:text-ink-gold"
        >
          ↗ ZOBACZ STRONĘ
        </Link>
      </div>
    </aside>
  );
}
