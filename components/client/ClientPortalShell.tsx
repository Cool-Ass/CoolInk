"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Bell, CalendarCheck, FileText, Home, Mail, Menu, Megaphone, User } from "lucide-react";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";

const links = [
  ["/app/portal", "START", Home, true],
  ["/app/portal/projects", "PROJEKTY", FileText],
  ["/app/portal/calendar", "KALENDARZ", CalendarCheck],
  ["/app/portal/messages", "WIADOMOŚCI", Mail],
  ["/app/portal/documents", "DOKUMENTY", FileText],
  ["/app/portal/notifications", "POWIADOMIENIA", Megaphone],
  ["/app/portal/profile", "PROFIL", User],
] as const;
const primaryLinks = links.slice(0, 4);
const secondaryLinks = links.slice(4);

function Counter({ count }: { count: number }) { return count > 0 ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-ink-gold px-1 text-center text-[9px] leading-4 text-ink-black">{count > 99 ? "99+" : count}</span> : null; }

export default function ClientPortalShell({ firstName, unreadMessages, unreadNotifications, children }: { firstName: string; unreadMessages: number; unreadNotifications: number; children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);
  const countFor = (href: string) => href.endsWith("/messages") ? unreadMessages : href.endsWith("/notifications") ? unreadNotifications : 0;
  return <main className="min-h-screen bg-ink-black px-4 py-5 text-ink-white sm:px-6 lg:px-10 lg:py-10"><header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink-white/15 pb-4"><Link href="/" className="font-display text-2xl">COOLINK</Link><div className="flex items-center gap-2"><div className="hidden items-center gap-2 sm:flex"><Utility href="/app/portal/messages" label="Wiadomości" count={unreadMessages}><Mail className="h-4 w-4" /></Utility><Utility href="/app/portal/notifications" label="Powiadomienia" count={unreadNotifications}><Bell className="h-4 w-4" /></Utility></div><ClientLogoutButton /></div></header><div className="mx-auto grid max-w-7xl gap-7 py-7 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="hidden h-fit border border-ink-white/15 bg-ink-charcoal/30 p-4 lg:sticky lg:top-6 lg:block"><p className="text-[10px] tracking-[.16em] text-ink-gold">TWOJE KONTO</p><p className="mt-2 font-display text-2xl">{firstName}</p><nav className="mt-4 border-y border-ink-white/10 py-3 text-xs">{links.map(([href, label, Icon, exact]) => <Link key={href} href={href} className={`relative flex items-center gap-3 px-2 py-3 ${active(href, exact) ? "text-ink-gold" : "text-ink-grey hover:text-ink-gold"}`}><Icon className="h-4 w-4" />{label}<span className="ml-auto"><Counter count={countFor(href)} /></span></Link>)}</nav></aside><div className="min-w-0 pb-20 lg:pb-0">{children}</div></div><nav aria-label="Główna nawigacja klienta" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-white/15 bg-ink-charcoal px-1 py-2 lg:hidden">{primaryLinks.map(([href, label, Icon, exact]) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[9px] ${active(href, exact) ? "text-ink-gold" : "text-ink-grey"}`}><Icon className="h-4 w-4" />{label}<Counter count={countFor(href)} /></Link>)}<button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className="relative flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[9px] text-ink-grey"><Menu className="h-4 w-4" />WIĘCEJ<Counter count={unreadNotifications} /></button></nav>{moreOpen && <div className="fixed inset-x-3 bottom-[76px] z-40 border border-ink-white/15 bg-ink-charcoal p-3 shadow-2xl lg:hidden"><div className="grid grid-cols-3 gap-2">{secondaryLinks.map(([href, label, Icon, exact]) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className={`relative flex min-h-16 flex-col items-center justify-center gap-2 border text-[10px] ${active(href, exact) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}><Icon className="h-4 w-4" />{label}<Counter count={countFor(href)} /></Link>)}</div></div>}</main>;
}

function Utility({ href, label, count, children }: { href: string; label: string; count: number; children: ReactNode }) { return <Link href={href} aria-label={label} title={label} className="relative flex h-10 w-10 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold">{children}<Counter count={count} /></Link>; }
