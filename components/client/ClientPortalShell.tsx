"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, FileText, Home, Menu, MessageCircle, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import ClientHeaderUtilities from "@/components/client/ClientHeaderUtilities";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";

const links = [
  { href: "/app/portal", label: "Start", icon: Home, exact: true },
  { href: "/app/portal/projects", label: "Projekty", icon: FileText, exact: false },
  { href: "/app/portal/calendar", label: "Kalendarz", icon: CalendarCheck, exact: false },
  { href: "/app/portal/messages", label: "Wiadomości", icon: MessageCircle, exact: false },
  { href: "/app/portal/documents", label: "Dokumenty", icon: FileText, exact: false },
  { href: "/app/portal/profile", label: "Profil", icon: User, exact: false },
] as const;
const primaryLinks = links.slice(0, 4);
const secondaryLinks = links.slice(4);

type Props = {
  firstName: string;
  unreadMessages: number;
  unreadNotifications: number;
  messages: { id: string; projectId: string; project: string; body: string; createdAt: string; unread: boolean }[];
  notifications: { id: string; title: string; body: string; href: string | null; createdAt: string; unread: boolean }[];
  children: ReactNode;
};

export default function ClientPortalShell({ firstName, unreadMessages, unreadNotifications, messages, notifications, children }: Props) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);
  const logo = logoFailed ? <span className="font-display text-base tracking-[.08em] text-ink-white">COOLINK</span> : <Image src="/images/logo-white.jpg" alt="CoolInk Tattoo Studio" width={112} height={34} priority onError={() => setLogoFailed(true)} className="h-full w-full object-contain object-left mix-blend-screen" />;

  return <main className="client-shell flex min-h-screen bg-ink-black text-ink-white">
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-ink-white/10 bg-ink-charcoal/55 shadow-[12px_0_40px_rgba(0,0,0,.16)] backdrop-blur md:flex">
      <Link href="/" aria-label="CoolInk Tattoo Studio" className="flex h-[65px] items-center border-b border-ink-white/10 px-5"><span className="h-8 w-24">{logo}</span></Link>
      <div className="px-5 pb-2 pt-4"><p className="text-[9px] font-semibold tracking-[.18em] text-ink-grey/60">TWOJE KONTO</p><p className="mt-1 truncate text-sm text-ink-white">{firstName}</p></div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {links.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} className={`flex min-h-9 items-center gap-2.5 border-l-2 px-3 py-2 text-[12px] tracking-[.02em] ${active(href, exact) ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-transparent text-ink-grey hover:text-ink-white"}`}><Icon className="h-3.5 w-3.5 shrink-0" />{label}{label === "Wiadomości" && unreadMessages > 0 && <span className="ml-auto rounded-full bg-ink-gold px-1.5 text-[9px] text-ink-black">{unreadMessages}</span>}</Link>)}
      </nav>
      <div className="border-t border-ink-white/10 px-5 py-3.5"><Link href="/" className="text-[10px] tracking-[.1em] text-ink-grey hover:text-ink-gold">↗ ZOBACZ STRONĘ</Link></div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-40 flex min-h-[61px] items-center justify-between border-b border-ink-white/10 bg-ink-black/85 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,.12)] backdrop-blur-xl sm:px-5 md:px-6">
        <div className="flex min-w-0 items-center gap-3"><Link href="/" aria-label="CoolInk Tattoo Studio" className="h-8 w-24 md:hidden">{logo}</Link><p className="hidden truncate text-xs tracking-[.04em] text-ink-grey md:block">Klient · <span className="text-ink-white">{firstName}</span></p></div>
        <div className="flex items-center gap-2"><ClientHeaderUtilities messages={messages} notifications={notifications} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} /><span className="hidden border border-ink-white/20 px-4 py-2.5 sm:block"><ClientLogoutButton /></span></div>
      </header>
      <div className="client-workspace flex-1 p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-6 xl:p-7"><div className="mx-auto w-full max-w-[1800px]">{children}</div></div>
    </div>

    <nav aria-label="Główna nawigacja klienta" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-white/15 bg-ink-charcoal/95 px-1 pb-[max(.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_36px_rgba(0,0,0,.35)] backdrop-blur-xl md:hidden">
      {primaryLinks.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[9px] ${active(href, exact) ? "text-ink-gold" : "text-ink-grey"}`}><Icon className="h-4 w-4" />{label.toLocaleUpperCase("pl-PL")}{label === "Wiadomości" && unreadMessages > 0 && <span className="absolute right-2 top-0 rounded-full bg-ink-gold px-1.5 text-[9px] text-ink-black">{unreadMessages}</span>}</Link>)}
      <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className="flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[9px] text-ink-grey"><Menu className="h-4 w-4" />WIĘCEJ</button>
    </nav>
    {moreOpen && <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 border border-ink-white/15 bg-ink-charcoal p-2 shadow-2xl md:hidden"><div className="grid grid-cols-2 gap-2">{secondaryLinks.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`flex min-h-12 items-center justify-center gap-2 border text-[10px] ${active(href, exact) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}><Icon className="h-4 w-4" />{label.toLocaleUpperCase("pl-PL")}</Link>)}</div><div className="mt-2 flex justify-center border border-ink-white/15 py-3 sm:hidden"><ClientLogoutButton /></div></div>}
  </main>;
}
