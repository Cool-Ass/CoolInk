"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Megaphone, Search } from "lucide-react";
import { getAdminSections } from "@/components/admin/Sidebar";
import AdminGlobalSearch from "@/components/admin/AdminGlobalSearch";
import AppModal from "@/components/ui/AppModal";
import { ADMIN_ROLE_LABEL, normalizeAdminRole } from "@/lib/adminPermissions";

type InboxItem = { id: string; clientId: string; client: string; project: string; body: string; createdAt: string; unread: boolean };
type NotificationItem = { id: string; title: string; body: string; createdAt: string; unread: boolean };

export default function Topbar({
  adminEmail,
  adminRole = "owner",
  unreadMessages = 0,
  unreadNotifications = 0,
  inbox = [],
  notifications = [],
}: {
  adminEmail: string;
  adminRole?: string;
  unreadMessages?: number;
  unreadNotifications?: number;
  inbox?: InboxItem[];
  notifications?: NotificationItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState(notifications);
  const [notificationCount, setNotificationCount] = useState(unreadNotifications);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally { setLoggingOut(false); }
  }

  async function markAllNotificationsRead() {
    const response = await fetch("/api/admin/notifications/read-all", { method: "POST" });
    if (!response.ok) return;
    setNotificationItems((items) => items.map((item) => ({ ...item, unread: false })));
    setNotificationCount(0);
    router.refresh();
  }

  return <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-white/10 bg-ink-black/85 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,.12)] backdrop-blur-xl sm:px-5 md:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Otwórz nawigację administratora" className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink-white/20 text-lg text-ink-white hover:border-ink-gold hover:text-ink-gold md:hidden">☰</button>
      {pathname !== "/admin" && <Link href="/admin" aria-label="Wróć do panelu głównego" className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink-white/20 text-lg text-ink-white hover:border-ink-gold hover:text-ink-gold md:hidden">←</Link>}
      <p className="truncate text-xs tracking-[0.04em] text-ink-grey"><span className="md:hidden">PANEL ADMINA</span><span className="hidden md:inline">{ADMIN_ROLE_LABEL[normalizeAdminRole(adminRole)]} · <span className="text-ink-white">{adminEmail}</span></span></p>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setSearchOpen(true)} aria-label="Szukaj w systemie" title="Szukaj (Ctrl+K)" className="flex h-10 items-center gap-2 border border-ink-white/15 bg-ink-white/[.025] px-3 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Search className="h-4 w-4" /><span className="hidden text-[10px] tracking-[.08em] lg:inline">SZUKAJ</span><kbd className="hidden border border-ink-white/10 px-1.5 py-0.5 text-[9px] text-ink-grey/70 xl:inline">Ctrl K</kbd></button>
      <button type="button" onClick={() => setInboxOpen(true)} aria-label="Wiadomości" title="Wiadomości" className="relative flex h-10 w-10 items-center justify-center border border-ink-white/20 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Mail className="h-4 w-4" />{unreadMessages > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-ink-gold px-1 text-[11px] text-ink-black">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</button>
      <button type="button" onClick={() => setNotificationsOpen(true)} aria-label="Powiadomienia" title="Powiadomienia" className="relative flex h-10 w-10 items-center justify-center border border-ink-white/20 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Megaphone className="h-4 w-4" />{notificationCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-ink-gold px-1 text-[11px] text-ink-black">{notificationCount > 99 ? "99+" : notificationCount}</span>}</button>
      <button type="button" onClick={handleLogout} disabled={loggingOut} className="hidden border border-ink-white/20 px-4 py-2.5 text-xs tracking-[0.08em] text-ink-white hover:border-ink-gold hover:text-ink-gold disabled:opacity-50 sm:block">{loggingOut ? "WYLOGOWYWANIE…" : "WYLOGUJ"}</button>
    </div>

    {menuOpen && <nav aria-label="Nawigacja administratora" className="absolute inset-x-0 top-full z-50 border-b border-ink-white/15 bg-ink-charcoal p-4 shadow-2xl md:hidden">
      {getAdminSections(adminRole).map((section) => <div key={section.label} className="mb-4 last:mb-0"><p className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-grey">{section.label}</p><div className="grid grid-cols-2 gap-2">{section.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`border px-3 py-3 text-xs ${pathname === link.href || (!("exact" in link && link.exact) && pathname.startsWith(link.href)) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{link.label}</Link>)}</div></div>)}
      <button type="button" onClick={handleLogout} className="mt-2 w-full border border-ink-white/20 px-3 py-3 text-left text-xs text-ink-grey sm:hidden">WYLOGUJ</button>
    </nav>}
    {searchOpen && <AdminGlobalSearch onClose={() => setSearchOpen(false)} />}
    {inboxOpen && <AppModal title="Wiadomości" size="md" onClose={() => setInboxOpen(false)}><div className="space-y-2">{inbox.length ? inbox.map((item) => <Link key={item.id} href={`/admin/clients/${item.clientId}?view=messages`} onClick={() => setInboxOpen(false)} className={`block border p-3 ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10"}`}><div className="flex justify-between gap-3"><p className="text-sm">{item.client}</p><time className="text-xs text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-1 text-xs text-ink-gold">{item.project}</p><p className="mt-2 line-clamp-2 text-sm text-ink-grey">{item.body}</p></Link>) : <p className="text-sm text-ink-grey">Brak rozmów.</p>}</div></AppModal>}
    {notificationsOpen && <AppModal title="Powiadomienia" size="md" onClose={() => setNotificationsOpen(false)} headerAction={notificationCount > 0 ? <button type="button" onClick={markAllNotificationsRead} className="border border-ink-gold/60 px-2 py-2 text-xs text-ink-gold">OZNACZ WSZYSTKIE</button> : undefined}><div className="space-y-2">{notificationItems.length ? notificationItems.map((item) => <article key={item.id} className={`border p-3 ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10"}`}><div className="flex justify-between gap-3"><p className="text-sm">{item.title}</p><time className="text-xs text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-ink-grey">{item.body}</p></article>) : <p className="text-sm text-ink-grey">Brak powiadomień.</p>}</div></AppModal>}
  </header>;
}
