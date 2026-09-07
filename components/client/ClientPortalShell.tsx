"use client";

import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, FileText, Home, Menu, MessageCircle, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import ClientHeaderUtilities from "@/components/client/ClientHeaderUtilities";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";

const links = [
  { href: "/app/portal", label: "START", icon: Home, exact: true },
  { href: "/app/portal/projects", label: "PROJEKTY", icon: FileText, exact: false },
  { href: "/app/portal/calendar", label: "KALENDARZ", icon: CalendarCheck, exact: false },
  { href: "/app/portal/messages", label: "WIADOMOŚCI", icon: MessageCircle, exact: false },
  { href: "/app/portal/documents", label: "DOKUMENTY", icon: FileText, exact: false },
  { href: "/app/portal/profile", label: "PROFIL", icon: User, exact: false },
] as const;
const primaryLinks = links.slice(0, 4);
const secondaryLinks = links.slice(4);

export default function ClientPortalShell({ firstName, unreadMessages, unreadNotifications, messages, notifications, children }: { firstName: string; unreadMessages: number; unreadNotifications: number; messages: { id: string; projectId: string; project: string; body: string; createdAt: string; unread: boolean }[]; notifications: { id: string; title: string; body: string; href: string | null; createdAt: string; unread: boolean }[]; children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return <main className="min-h-screen bg-ink-black px-4 py-5 text-ink-white sm:px-6 lg:px-10 lg:py-10">
    <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink-white/15 pb-4"><Link href="/" aria-label="CoolInk Tattoo Studio" className="flex h-10 w-32 items-center">{logoFailed ? <span className="font-display text-xl tracking-wide text-ink-white">COOLINK</span> : <Image src="/images/logo-white.jpg" alt="CoolInk Tattoo Studio" width={128} height={40} priority onError={() => setLogoFailed(true)} className="h-full w-full object-contain object-left" />}</Link><div className="flex items-center gap-2"><ClientHeaderUtilities messages={messages} notifications={notifications} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} /><ClientLogoutButton /></div></header>
    <div className="mx-auto grid max-w-7xl gap-7 py-7 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="hidden h-fit border border-ink-white/15 bg-ink-charcoal/30 p-4 lg:sticky lg:top-6 lg:block"><p className="text-xs tracking-[.16em] text-ink-gold">TWOJE KONTO</p><p className="mt-2 font-display text-2xl">{firstName}</p><nav className="mt-4 border-y border-ink-white/10 py-3 text-sm">{links.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 px-2 py-3 ${active(href, exact) ? "text-ink-gold" : "text-ink-grey hover:text-ink-gold"}`}><Icon className="h-4 w-4" />{label}{label === "WIADOMOŚCI" && unreadMessages > 0 && <span className="ml-auto bg-ink-gold px-2 py-0.5 text-xs text-ink-black">{unreadMessages}</span>}</Link>)}</nav></aside>
      <div className="min-w-0 pb-20 lg:pb-0">{children}</div>
    </div>
    <nav aria-label="Główna nawigacja klienta" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-white/15 bg-ink-charcoal px-1 py-2 lg:hidden">{primaryLinks.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[11px] ${active(href, exact) ? "text-ink-gold" : "text-ink-grey"}`}><Icon className="h-4 w-4" />{label}{label === "WIADOMOŚCI" && unreadMessages > 0 && <span className="absolute right-2 top-0 rounded-full bg-ink-gold px-1.5 text-[11px] text-ink-black">{unreadMessages}</span>}</Link>)}<button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className="flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[11px] text-ink-grey"><Menu className="h-4 w-4" />WIĘCEJ</button></nav>
    {moreOpen && <div className="fixed inset-x-3 bottom-[76px] z-40 border border-ink-white/15 bg-ink-charcoal p-3 shadow-2xl lg:hidden"><div className="grid grid-cols-2 gap-2">{secondaryLinks.map(({ href, label, icon: Icon, exact }) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`flex min-h-16 items-center justify-center gap-2 border text-xs ${active(href, exact) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}><Icon className="h-4 w-4" />{label}</Link>)}</div></div>}
  </main>;
}
