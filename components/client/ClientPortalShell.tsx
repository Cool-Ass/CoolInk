"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ClientLogoutButton from "@/components/client/ClientLogoutButton";

const links = [
  ["/app/portal", "START", true],
  ["/app/portal/projects", "PROJEKTY"],
  ["/app/portal/calendar", "KALENDARZ"],
  ["/app/portal/messages", "WIADOMOŚCI"],
  ["/app/portal/documents", "DOKUMENTY"],
  ["/app/portal/notifications", "POWIADOMIENIA"],
  ["/app/portal/profile", "PROFIL"],
] as const;

export default function ClientPortalShell({ firstName, unreadMessages, unreadNotifications, children }: { firstName: string; unreadMessages: number; unreadNotifications: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);
  const badge = (href: string) => href.endsWith("messages") ? unreadMessages : href.endsWith("notifications") ? unreadNotifications : 0;
  return <main className="min-h-screen bg-ink-black px-4 py-5 text-ink-white sm:px-6 lg:px-10 lg:py-10"><header className="mx-auto flex max-w-7xl items-center justify-between border-b border-ink-white/15 pb-4"><Link href="/" className="font-display text-2xl">COOLINK</Link><ClientLogoutButton /></header><div className="mx-auto grid max-w-7xl gap-7 py-7 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="hidden h-fit border border-ink-white/15 bg-ink-charcoal/30 p-4 lg:sticky lg:top-6 lg:block"><p className="text-[10px] tracking-[.16em] text-ink-gold">TWOJE KONTO</p><p className="mt-2 font-display text-2xl">{firstName}</p><nav className="mt-4 border-y border-ink-white/10 py-3 text-xs">{links.map(([href, label, exact]) => <Link key={href} href={href} className={`flex items-center justify-between px-2 py-2.5 ${active(href, exact) ? "text-ink-gold" : "text-ink-grey hover:text-ink-gold"}`}>{label}{badge(href) > 0 && <span className="rounded-full bg-ink-gold px-1.5 py-0.5 text-[9px] text-ink-black">{badge(href)}</span>}</Link>)}</nav><Link href="/app/new-project" className="mt-4 block border border-ink-gold px-3 py-3 text-center text-xs text-ink-gold hover:bg-ink-gold hover:text-ink-black">NOWE ZGŁOSZENIE</Link></aside><div className="min-w-0 pb-16 lg:pb-0">{children}</div></div><nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-white/15 bg-ink-charcoal px-1 py-2 lg:hidden">{links.slice(0, 4).map(([href, label, exact]) => <Link key={href} href={href} className={`relative min-h-11 px-1 pt-1 text-center text-[9px] ${active(href, exact) ? "text-ink-gold" : "text-ink-grey"}`}>{label}{badge(href) > 0 && <span className="absolute right-1 top-0 rounded-full bg-ink-gold px-1 text-[8px] text-ink-black">{badge(href)}</span>}</Link>)}<Link href="/app/portal/profile" className={`min-h-11 px-1 pt-1 text-center text-[9px] ${pathname.includes("documents") || pathname.includes("notifications") || pathname.includes("profile") ? "text-ink-gold" : "text-ink-grey"}`}>WIĘCEJ</Link></nav></main>;
}
