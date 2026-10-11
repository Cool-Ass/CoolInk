"use client";
import ContinuationReminder from "@/components/admin/ContinuationReminder";
import { useState } from "react";
import Link from "next/link";
import { ACTION_GROUPS, type ActionGroup } from "@/lib/studioActions";
import { formatCoolinkDateTime } from "@/lib/dateTime";
type Item = { key: string; group: ActionGroup; priority: number; title: string; detail: string; href: string; cta: string; projectId?: string; visitAt?: string | null; visitLabel?: string; dueAt?: string | null; receivedAt?: string | null };
const fmt = (value: string) => formatCoolinkDateTime(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export default function StudioActionQueue({ items }: { items: Item[] }) {
  const [group, setGroup] = useState<ActionGroup | "all">("all");
  return <section aria-label="Kolejka działań" className="space-y-4">
    <div role="group" aria-label="Kategorie działań" className="flex flex-wrap gap-2"><button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")} className="studio-action-filter">Wszystkie · {items.length}</button>{ACTION_GROUPS.map(g => <button type="button" key={g.id} aria-pressed={group === g.id} onClick={() => setGroup(g.id)} className="studio-action-filter">{g.title} · {items.filter(i => i.group === g.id).length}</button>)}</div>
    {ACTION_GROUPS.filter(g => group === "all" || group === g.id).map(g => {
      const rows = items.filter(i => i.group === g.id);
      if (!rows.length && group === "all") return null;
      return <section key={g.id} aria-label={g.title}><h3 className="mb-2 text-sm font-semibold text-ink-white">{g.title} <span className="ml-1 text-ink-grey">{rows.length}</span></h3><div className="divide-y divide-ink-white/10">{rows.map(item => <article key={item.key}><Link href={item.href} className="block rounded-lg px-2 py-3 transition-colors hover:bg-ink-white/5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-ink-white">{item.title}</p>{item.priority === 1 && <span className="shrink-0 rounded bg-red-400/10 px-2 py-1 text-xs text-red-200">Pilne</span>}</div><p className="mt-1 text-xs leading-relaxed text-ink-grey">{item.detail}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">{item.visitAt && <time dateTime={item.visitAt} className="text-ink-gold">{item.visitLabel ?? "Wizyta"}: {fmt(item.visitAt)}</time>}{item.dueAt && <time dateTime={item.dueAt} className="text-ink-grey">Działanie do: {fmt(item.dueAt)}</time>}{item.receivedAt && <time dateTime={item.receivedAt} className="text-ink-grey">{g.id === "messages" ? "Czeka od" : "Zgłoszono"}: {fmt(item.receivedAt)}</time>}</div><p className="mt-2 text-xs text-ink-gold">{item.cta} →</p></Link>{item.group === "continuations" && item.projectId && <ContinuationReminder projectId={item.projectId} />}</article>)}{!rows.length && <p className="py-3 text-sm text-ink-grey">{g.empty}</p>}</div></section>;
    })}
    {!items.length && group === "all" && <p className="py-4 text-sm text-ink-grey">Wszystko załatwione.</p>}
  </section>;
}
