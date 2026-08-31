"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, FileText, Home, Mail, Megaphone, User } from "lucide-react";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";

const links = [
  ["/app/portal", "START", Home, true],
  ["/app/portal/visits", "MOJE WIZYTY", CalendarCheck],
  ["/app/portal/documents", "DOKUMENTY", FileText],
  ["/app/portal/profile", "PROFIL", User],
] as const;

function Counter({ count }: { count: number }) { return count > 0 ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-ink-gold px-1 text-center text-[9px] leading-4 text-ink-black">{count > 99 ? "99+" : count}</span> : null; }

export default function ClientPortalShell({ firstName, unreadMessages, unreadNotifications, children }: { firstName: string; unreadMessages: number; unreadNotifications: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);
  return <main className="min-h-screen bg-ink-black px-4 py-5 text-ink-white sm:px-6 lg:px-10 lg:py-10"><header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink-white/15 pb-4"><Link href="/" className="font-display text-2xl">COOLINK</Link><div className="flex items-center gap-2"><Utility href="/app/portal/messages" label="Wiadomości" count={unreadMessages}><Mail className="h-4 w-4" /></Utility><Utility href="/app/portal/notifications" label="Powiadomienia" count={unreadNotifications}><Megaphone className="h-4 w-4" /></Utility><ClientLogoutButton /></div></header><div className="mx-auto grid max-w-7xl gap-7 py-7 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="hidden h-fit border border-ink-white/15 bg-ink-charcoal/30 p-4 lg:sticky lg:top-6 lg:block"><p className="text-[10px] tracking-[.16em] text-ink-gold">TWOJE KONTO</p><p className="mt-2 font-display text-2xl">{firstName}</p><nav className="mt-4 border-y border-ink-white/10 py-3 text-xs">{links.map(([href, label, Icon, exact]) => <Link key={href} href={href} className={`flex items-center gap-3 px-2 py-3 ${active(href, exact) ? "text-ink-gold" : "text-ink-grey hover:text-ink-gold"}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav></aside><div className="min-w-0 pb-16 lg:pb-0">{children}</div></div><nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-ink-white/15 bg-ink-charcoal px-1 py-2 lg:hidden">{links.map(([href, label, Icon, exact]) => <Link key={href} href={href} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[9px] ${active(href, exact) ? "text-ink-gold" : "text-ink-grey"}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav></main>;
}

function Utility({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) { return <Link href={href} aria-label={label} title={label} className="relative flex h-10 w-10 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold">{children}<Counter count={count} /></Link>; }
