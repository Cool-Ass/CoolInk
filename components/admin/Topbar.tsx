"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Mail, Search, Trash2, X } from "lucide-react";
import { getAdminSections } from "@/components/admin/Sidebar";
import AdminGlobalSearch from "@/components/admin/AdminGlobalSearch";
import AppDrawer from "@/components/ui/AppDrawer";
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
  const [messageItems, setMessageItems] = useState(inbox);
  const [messageCount, setMessageCount] = useState(unreadMessages);
  const [notificationItems, setNotificationItems] = useState(notifications);
  const [notificationCount, setNotificationCount] = useState(unreadNotifications);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);

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

  async function updateInbox(kind: "messages" | "notifications", method: "PATCH" | "DELETE", id: string) {
    return fetch("/api/admin/inbox", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) });
  }

  async function markRead(kind: "messages" | "notifications", id: string) {
    const items = kind === "messages" ? messageItems : notificationItems;
    const targets = id === "all" ? items.filter((item) => item.unread) : items.filter((item) => item.id === id && item.unread);
    if (!targets.length) return;
    const response = await updateInbox(kind, "PATCH", id);
    if (!response.ok) return;
    if (kind === "messages") {
      setMessageItems((current) => current.map((item) => id === "all" || item.id === id ? { ...item, unread: false } : item));
      setMessageCount((count) => Math.max(0, count - targets.length));
    } else {
      setNotificationItems((current) => current.map((item) => id === "all" || item.id === id ? { ...item, unread: false } : item));
      setNotificationCount((count) => Math.max(0, count - targets.length));
    }
  }

  async function removeItems(kind: "messages" | "notifications", id: string) {
    if (id === "all" && !window.confirm(`Usunąć wszystkie ${kind === "messages" ? "wiadomości z tego panelu" : "powiadomienia"}?`)) return;
    const response = await updateInbox(kind, "DELETE", id);
    if (!response.ok) return;
    if (kind === "messages") {
      const removed = id === "all" ? messageItems : messageItems.filter((item) => item.id === id);
      setMessageItems((current) => id === "all" ? [] : current.filter((item) => item.id !== id));
      setMessageCount((count) => Math.max(0, count - removed.filter((item) => item.unread).length));
    } else {
      const removed = id === "all" ? notificationItems : notificationItems.filter((item) => item.id === id);
      setNotificationItems((current) => id === "all" ? [] : current.filter((item) => item.id !== id));
      setNotificationCount((count) => Math.max(0, count - removed.filter((item) => item.unread).length));
    }
    router.refresh();
  }

  return <header className="studio-topbar">
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Otwórz nawigację administratora" className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink-white/20 text-lg text-ink-white hover:border-ink-gold hover:text-ink-gold md:hidden">☰</button>
      {pathname !== "/admin" && <Link href="/admin" aria-label="Wróć do panelu głównego" className="flex h-10 w-10 shrink-0 items-center justify-center border border-ink-white/20 text-lg text-ink-white hover:border-ink-gold hover:text-ink-gold md:hidden">←</Link>}
      <p className="truncate text-xs tracking-[0.04em] text-ink-grey"><span className="md:hidden">PANEL ADMINA</span><span className="hidden md:inline">{ADMIN_ROLE_LABEL[normalizeAdminRole(adminRole)]} · <span className="text-ink-white">{adminEmail}</span></span></p>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setSearchOpen(true)} aria-label="Szukaj w systemie" title="Szukaj (Ctrl+K)" className="flex h-10 items-center gap-2 border border-ink-white/15 bg-ink-white/[.025] px-3 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Search className="h-4 w-4" /><span className="hidden text-[10px] tracking-[.08em] lg:inline">SZUKAJ</span><kbd className="hidden border border-ink-white/10 px-1.5 py-0.5 text-[9px] text-ink-grey/70 xl:inline">Ctrl K</kbd></button>
      <button type="button" onClick={() => setInboxOpen(true)} aria-label="Wiadomości" title="Wiadomości" className="relative flex h-10 w-10 items-center justify-center border border-ink-white/20 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Mail className="h-4 w-4" />{messageCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-ink-gold px-1 text-[11px] text-ink-black">{messageCount > 99 ? "99+" : messageCount}</span>}</button>
      <button type="button" onClick={() => setNotificationsOpen(true)} aria-label="Powiadomienia" title="Powiadomienia" className="relative flex h-10 w-10 items-center justify-center border border-ink-white/20 text-ink-grey hover:border-ink-gold hover:text-ink-gold"><Bell className="h-4 w-4" />{notificationCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-ink-gold px-1 text-[11px] text-ink-black">{notificationCount > 99 ? "99+" : notificationCount}</span>}</button>
      <button type="button" onClick={handleLogout} disabled={loggingOut} className="hidden border border-ink-white/20 px-4 py-2.5 text-xs tracking-[0.08em] text-ink-white hover:border-ink-gold hover:text-ink-gold disabled:opacity-50 sm:block">{loggingOut ? "WYLOGOWYWANIE…" : "WYLOGUJ"}</button>
    </div>

    {menuOpen && <nav aria-label="Nawigacja administratora" className="absolute inset-x-0 top-full z-50 border-b border-ink-white/15 bg-ink-charcoal p-4 shadow-2xl md:hidden">
      {getAdminSections(adminRole).map((section) => <div key={section.label} className="mb-4 last:mb-0"><p className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-grey">{section.label}</p><div className="grid grid-cols-2 gap-2">{section.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={`border px-3 py-3 text-xs ${pathname === link.href || (!("exact" in link && link.exact) && pathname.startsWith(link.href)) ? "border-ink-gold text-ink-gold" : "border-ink-white/15 text-ink-grey"}`}>{link.label}</Link>)}</div></div>)}
      <button type="button" onClick={handleLogout} className="mt-2 w-full border border-ink-white/20 px-3 py-3 text-left text-xs text-ink-grey sm:hidden">WYLOGUJ</button>
    </nav>}
    {searchOpen && <AdminGlobalSearch onClose={() => setSearchOpen(false)} />}
    {inboxOpen && <AppDrawer title="Wiadomości" subtitle="Najnowsze rozmowy z klientami" onClose={() => setInboxOpen(false)} actions={<><button type="button" onClick={() => markRead("messages", "all")} disabled={!messageItems.some((item) => item.unread)} className="inline-flex items-center gap-2 border border-ink-white/15 px-3 py-2 text-[10px] text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-35"><CheckCheck className="h-3.5 w-3.5" />ODCZYTAJ WSZYSTKIE</button><button type="button" onClick={() => removeItems("messages", "all")} disabled={!messageItems.length} className="inline-flex items-center gap-2 border border-red-400/30 px-3 py-2 text-[10px] text-red-300 hover:border-red-400 disabled:opacity-35"><Trash2 className="h-3.5 w-3.5" />USUŃ WSZYSTKIE</button></>}><div className="space-y-2">{messageItems.length ? messageItems.map((item) => <article key={item.id} className={`relative border ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10 bg-ink-charcoal/20"}`}><button type="button" onClick={async () => { await markRead("messages", item.id); setInboxOpen(false); router.push(`/admin/clients/${item.clientId}?view=messages`); }} className="block w-full p-3 pr-12 text-left"><div className="flex justify-between gap-3"><p className="text-sm text-ink-white">{item.client}</p><time className="text-[10px] text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-1 text-xs text-ink-gold">{item.project}</p><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-grey">{item.body}</p></button><button type="button" onClick={() => removeItems("messages", item.id)} aria-label={`Usuń wiadomość: ${item.project}`} title="Usuń" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-red-400/35 bg-ink-black/80 text-red-300 hover:border-red-400 hover:bg-red-500/10"><X className="h-4 w-4" /></button></article>) : <p className="border border-dashed border-ink-white/15 p-6 text-center text-sm text-ink-grey">Brak wiadomości.</p>}</div></AppDrawer>}
    {notificationsOpen && <AppDrawer title="Powiadomienia" subtitle="Zapytania i zdarzenia wymagające uwagi" onClose={() => setNotificationsOpen(false)} actions={<><button type="button" onClick={() => markRead("notifications", "all")} disabled={!notificationItems.some((item) => item.unread)} className="inline-flex items-center gap-2 border border-ink-white/15 px-3 py-2 text-[10px] text-ink-grey hover:border-ink-gold hover:text-ink-gold disabled:opacity-35"><CheckCheck className="h-3.5 w-3.5" />ODCZYTAJ WSZYSTKIE</button><button type="button" onClick={() => removeItems("notifications", "all")} disabled={!notificationItems.length} className="inline-flex items-center gap-2 border border-red-400/30 px-3 py-2 text-[10px] text-red-300 hover:border-red-400 disabled:opacity-35"><Trash2 className="h-3.5 w-3.5" />USUŃ WSZYSTKIE</button></>}><div className="space-y-2">{notificationItems.length ? notificationItems.map((item) => <article key={item.id} className={`relative border ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10 bg-ink-charcoal/20"}`}><button type="button" onClick={() => { markRead("notifications", item.id); setExpandedNotification((current) => current === item.id ? null : item.id); }} aria-expanded={expandedNotification === item.id} className="block w-full p-3 pr-12 text-left"><div className="flex justify-between gap-3"><p className="text-sm text-ink-white">{item.title}</p><time className="text-[10px] text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-grey ${expandedNotification === item.id ? "" : "line-clamp-2"}`}>{item.body}</p><span className="mt-2 block text-[9px] tracking-wider text-ink-gold">{expandedNotification === item.id ? "ZWIŃ" : "ROZWIŃ"}</span></button><button type="button" onClick={() => removeItems("notifications", item.id)} aria-label={`Usuń powiadomienie: ${item.title}`} title="Usuń" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-red-400/35 bg-ink-black/80 text-red-300 hover:border-red-400 hover:bg-red-500/10"><X className="h-4 w-4" /></button></article>) : <p className="border border-dashed border-ink-white/15 p-6 text-center text-sm text-ink-grey">Brak powiadomień.</p>}</div></AppDrawer>}
  </header>;
}
