"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_SECTIONS } from "@/components/admin/Sidebar";
import { Mail, Megaphone } from "lucide-react";
import AppModal from "@/components/ui/AppModal";

export default function Topbar({ adminEmail, unreadMessages = 0, unreadNotifications = 0, inbox = [], notifications = [] }: { adminEmail: string; unreadMessages?: number; unreadNotifications?: number; inbox?: { id: string; clientId: string; client: string; project: string; body: string; createdAt: string; unread: boolean }[]; notifications?: { id: string; title: string; body: string; createdAt: string; unread: boolean }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState(notifications);
  const [notificationCount, setNotificationCount] = useState(unreadNotifications);

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
  async function markAllNotificationsRead() {
    const response = await fetch("/api/admin/notifications/read-all", { method: "POST" });
    if (!response.ok) return;
    setNotificationItems((items) => items.map((item) => ({ ...item, unread: false })));
    setNotificationCount(0);
    router.refresh();
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
      <div className="flex items-center gap-2"><button type="button" onClick={() => setInboxOpen(true)} aria-label="Wiadomości" title="Wiadomości" className="relative flex h-9 w-9 items-center justify-center border border-ink-white/20 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Mail className="h-4 w-4" />{unreadMessages > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-ink-gold px-1 text-[9px] text-ink-black">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</button><button type="button" onClick={() => setNotificationsOpen(true)} aria-label="Powiadomienia" title="Powiadomienia" className="relative flex h-9 w-9 items-center justify-center border border-ink-white/20 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Megaphone className="h-4 w-4" />{notificationCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-ink-gold px-1 text-ink-black">{notificationCount > 99 ? "99+" : notificationCount}</span>}</button><button
        onClick={handleLogout}
        disabled={loggingOut}
        className="border border-ink-white/20 px-4 py-2 text-[12px] tracking-[0.08em] text-ink-white transition-colors hover:border-ink-gold hover:text-ink-gold disabled:opacity-50"
      >
        {loggingOut ? "WYLOGOWYWANIE…" : "WYLOGUJ"}
      </button></div>
      {menuOpen && <nav aria-label="Nawigacja administratora" className="absolute inset-x-0 top-full z-50 border-b border-ink-white/15 bg-ink-charcoal p-4 shadow-2xl md:hidden">{ADMIN_SECTIONS.map((section) => <div key={section.label} className="mb-4 last:mb-0"><p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-ink-grey">{section.label}</p><div className="grid grid-cols-2 gap-2">{section.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`border px-3 py-3 text-xs ${pathname === link.href || (!("exact" in link && link.exact) && pathname.startsWith(link.href)) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{link.label}</Link>)}</div></div>)}</nav>}
      {inboxOpen && <AppModal title="Wiadomości" size="md" onClose={() => setInboxOpen(false)}><div className="space-y-2">{inbox.length ? inbox.map((item) => <Link key={item.id} href={`/admin/clients/${item.clientId}?view=messages`} onClick={() => setInboxOpen(false)} className={`block border p-3 ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10"}`}><div className="flex justify-between gap-3"><p className="text-sm">{item.client}</p><time className="text-[10px] text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-1 text-xs text-ink-gold">{item.project}</p><p className="mt-2 line-clamp-2 text-xs text-ink-grey">{item.body}</p></Link>) : <p className="text-sm text-ink-grey">Brak rozmów.</p>}</div></AppModal>}
      {notificationsOpen && <AppModal title="Powiadomienia" size="md" onClose={() => setNotificationsOpen(false)} headerAction={notificationCount > 0 ? <button type="button" onClick={markAllNotificationsRead} className="border border-ink-gold/60 px-2 py-2 text-[10px] text-ink-gold">OZNACZ WSZYSTKIE</button> : undefined}><div className="space-y-2">{notificationItems.length ? notificationItems.map((item) => <article key={item.id} className={`border p-3 ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10"}`}><div className="flex justify-between gap-3"><p className="text-sm">{item.title}</p><time className="text-[10px] text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-2 whitespace-pre-wrap text-xs text-ink-grey">{item.body}</p></article>) : <p className="text-sm text-ink-grey">Brak powiadomień.</p>}</div></AppModal>}
    </header>
  );
}
