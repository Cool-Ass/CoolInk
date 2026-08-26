"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Notification = { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string };

export default function ClientNotifications({ initial }: { initial: Notification[] }) {
  const router = useRouter(); const [items, setItems] = useState(initial); const unread = items.filter((item) => !item.readAt).length;
  async function mark(id: string) { await fetch("/api/client/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setItems((current) => current.map((item) => id === "all" || item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)); router.refresh(); }
  if (!items.length) return null;
  return <section className="mt-10 border border-ink-white/15 bg-ink-charcoal/30 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-[11px] tracking-[0.16em] text-ink-gold">POWIADOMIENIA</p><h2 className="mt-2 font-display text-2xl">Co nowego</h2></div>{unread > 0 && <button onClick={() => mark("all")} className="text-xs text-ink-gold">OZNACZ JAKO PRZECZYTANE</button>}</div><div className="mt-4 divide-y divide-ink-white/10">{items.map((item) => <a key={item.id} href={item.href || "#"} onClick={() => { if (!item.readAt) mark(item.id); }} className={`block py-4 ${item.readAt ? "opacity-60" : ""}`}><div className="flex justify-between gap-4"><p className="text-sm text-ink-white">{item.title}</p>{!item.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink-gold" />}</div><p className="mt-1 text-xs leading-relaxed text-ink-grey">{item.body}</p><time className="mt-2 block text-[10px] text-ink-grey">{new Date(item.createdAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</time></a>)}</div></section>;
}
