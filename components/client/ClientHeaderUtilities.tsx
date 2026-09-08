"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Mail, Trash2, X } from "lucide-react";
import AppDrawer from "@/components/ui/AppDrawer";

type Message = { id: string; projectId: string; project: string; body: string; createdAt: string; unread: boolean };
type Notification = { id: string; title: string; body: string; href: string | null; createdAt: string; unread: boolean };

function Badge({ count }: { count: number }) {
  return count ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-ink-gold px-1 text-center text-[9px] leading-4 text-ink-black">{count > 99 ? "99+" : count}</span> : null;
}

export default function ClientHeaderUtilities({ messages, notifications, unreadMessages, unreadNotifications }: { messages: Message[]; notifications: Notification[]; unreadMessages: number; unreadNotifications: number }) {
  const router = useRouter();
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messageItems, setMessageItems] = useState(messages);
  const [notificationItems, setNotificationItems] = useState(notifications);
  const [messageCount, setMessageCount] = useState(unreadMessages);
  const [notificationCount, setNotificationCount] = useState(unreadNotifications);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);

  async function request(kind: "messages" | "notifications", method: "PATCH" | "DELETE", id: string) {
    return fetch("/api/client/inbox", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) });
  }

  async function markRead(kind: "messages" | "notifications", id: string) {
    const source = kind === "messages" ? messageItems : notificationItems;
    const affected = id === "all" ? source.filter((item) => item.unread) : source.filter((item) => item.id === id && item.unread);
    if (!affected.length) return;
    if (!(await request(kind, "PATCH", id)).ok) return;
    if (kind === "messages") {
      setMessageItems((items) => items.map((item) => id === "all" || item.id === id ? { ...item, unread: false } : item));
      setMessageCount((count) => Math.max(0, count - affected.length));
    } else {
      setNotificationItems((items) => items.map((item) => id === "all" || item.id === id ? { ...item, unread: false } : item));
      setNotificationCount((count) => Math.max(0, count - affected.length));
    }
  }

  async function remove(kind: "messages" | "notifications", id: string) {
    if (id === "all" && !window.confirm(`Usunąć wszystkie ${kind === "messages" ? "wiadomości z tego panelu" : "powiadomienia"}?`)) return;
    if (!(await request(kind, "DELETE", id)).ok) return;
    if (kind === "messages") {
      const removed = id === "all" ? messageItems : messageItems.filter((item) => item.id === id);
      setMessageItems((items) => id === "all" ? [] : items.filter((item) => item.id !== id));
      setMessageCount((count) => Math.max(0, count - removed.filter((item) => item.unread).length));
    } else {
      const removed = id === "all" ? notificationItems : notificationItems.filter((item) => item.id === id);
      setNotificationItems((items) => id === "all" ? [] : items.filter((item) => item.id !== id));
      setNotificationCount((count) => Math.max(0, count - removed.filter((item) => item.unread).length));
    }
    router.refresh();
  }

  const actionClass = "inline-flex items-center gap-2 border px-3 py-2 text-[10px] disabled:opacity-35";
  const deleteClass = "absolute right-2 top-2 flex h-8 w-8 items-center justify-center border border-red-400/35 bg-ink-black/80 text-red-300 hover:border-red-400 hover:bg-red-500/10";
  const iconClass = "relative flex h-10 w-10 items-center justify-center border border-ink-white/15 text-ink-grey transition-colors hover:border-ink-gold hover:text-ink-gold";

  return <>
    <button type="button" className={iconClass} aria-label="Wiadomości" onClick={() => setMessagesOpen(true)}><Mail className="h-4 w-4" /><Badge count={messageCount} /></button>
    <button type="button" className={iconClass} aria-label="Powiadomienia" onClick={() => setNotificationsOpen(true)}><Bell className="h-4 w-4" /><Badge count={notificationCount} /></button>

    {messagesOpen && <AppDrawer title="Wiadomości" subtitle="Najnowsze wiadomości od studia" onClose={() => setMessagesOpen(false)} actions={<><button type="button" onClick={() => markRead("messages", "all")} disabled={!messageItems.some((item) => item.unread)} className={`${actionClass} border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold`}><CheckCheck className="h-3.5 w-3.5" />ODCZYTAJ WSZYSTKIE</button><button type="button" onClick={() => remove("messages", "all")} disabled={!messageItems.length} className={`${actionClass} border-red-400/30 text-red-300 hover:border-red-400`}><Trash2 className="h-3.5 w-3.5" />USUŃ WSZYSTKIE</button></>}>
      <div className="space-y-2">{messageItems.length ? messageItems.map((message) => <article key={message.id} className={`relative border ${message.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10 bg-ink-charcoal/20"}`}><button type="button" onClick={async () => { await markRead("messages", message.id); setMessagesOpen(false); router.push(`/app/portal/messages#${message.projectId}`); }} className="block w-full p-3 pr-12 text-left"><div className="flex justify-between gap-3"><p className="text-sm text-ink-white">{message.project}</p><time className="text-[10px] text-ink-grey">{new Date(message.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-grey">{message.body}</p></button><button type="button" onClick={() => remove("messages", message.id)} className={deleteClass} aria-label={`Usuń wiadomość: ${message.project}`} title="Usuń"><X className="h-4 w-4" /></button></article>) : <p className="border border-dashed border-ink-white/15 p-6 text-center text-sm text-ink-grey">Brak wiadomości.</p>}</div>
    </AppDrawer>}

    {notificationsOpen && <AppDrawer title="Powiadomienia" subtitle="Aktualizacje terminów, projektów i dokumentów" onClose={() => setNotificationsOpen(false)} actions={<><button type="button" onClick={() => markRead("notifications", "all")} disabled={!notificationItems.some((item) => item.unread)} className={`${actionClass} border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold`}><CheckCheck className="h-3.5 w-3.5" />ODCZYTAJ WSZYSTKIE</button><button type="button" onClick={() => remove("notifications", "all")} disabled={!notificationItems.length} className={`${actionClass} border-red-400/30 text-red-300 hover:border-red-400`}><Trash2 className="h-3.5 w-3.5" />USUŃ WSZYSTKIE</button></>}>
      <div className="space-y-2">{notificationItems.length ? notificationItems.map((item) => <article key={item.id} className={`relative border ${item.unread ? "border-ink-gold/50 bg-ink-gold/5" : "border-ink-white/10 bg-ink-charcoal/20"}`}><button type="button" onClick={async () => { await markRead("notifications", item.id); setExpandedNotification((current) => current === item.id ? null : item.id); }} aria-expanded={expandedNotification === item.id} className="block w-full p-3 pr-12 text-left"><div className="flex justify-between gap-3"><p className="text-sm text-ink-white">{item.title}</p><time className="text-[10px] text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}</time></div><p className={`mt-2 text-xs leading-relaxed text-ink-grey ${expandedNotification === item.id ? "" : "line-clamp-2"}`}>{item.body}</p>{item.href && expandedNotification === item.id && <span onClick={(event) => { event.stopPropagation(); setNotificationsOpen(false); router.push(item.href!); }} className="mt-3 inline-flex border border-ink-gold/50 px-3 py-2 text-[10px] tracking-wider text-ink-gold">PRZEJDŹ DO SZCZEGÓŁÓW →</span>}</button><button type="button" onClick={() => remove("notifications", item.id)} className={deleteClass} aria-label={`Usuń powiadomienie: ${item.title}`} title="Usuń"><X className="h-4 w-4" /></button></article>) : <p className="border border-dashed border-ink-white/15 p-6 text-center text-sm text-ink-grey">Brak powiadomień.</p>}</div>
    </AppDrawer>}
  </>;
}
