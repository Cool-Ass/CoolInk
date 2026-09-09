import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ADMIN_STATUS_LABEL } from "@/lib/projectWorkflow";
import StatusBadge from "@/components/ui/StatusBadge";
import { coolinkDayRange, formatCoolinkDateTime, formatCoolinkTime } from "@/lib/dateTime";

export const dynamic = "force-dynamic";
const fmt = (value: Date) => formatCoolinkDateTime(value, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const duration = (start: Date, end: Date) => `${Math.round((end.getTime() - start.getTime()) / 60000)} min`;

type ActionItem = { key: string; priority: 1 | 2 | 3; label: string; title: string; detail: string; href: string; dueAt?: Date | null };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const { access } = await searchParams;
  const now = new Date();
  const { start, end } = coolinkDayRange(now);
  const soon = new Date(now); soon.setDate(soon.getDate() + 14);
  const staleMessage = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const [today, newProjects, actionProjects, upcoming, unreadMessages, unreadDirectMessages, syncIssues, waitlistEntries] = await Promise.all([
    prisma.appointment.findMany({ where: { startsAt: { gte: start, lt: end }, status: { notIn: ["cancelled", "no_show"] } }, include: { project: { include: { client: true } } }, orderBy: { startsAt: "asc" } }),
    prisma.tattooProject.findMany({ where: { status: { in: ["inquiry", "reviewing"] } }, include: { client: true }, orderBy: { createdAt: "asc" }, take: 12 }),
    prisma.tattooProject.findMany({ where: { OR: [{ nextAction: { not: null } }, { status: { in: ["awaiting_client", "awaiting_confirmation", "awaiting_deposit", "confirmed", "awaiting_next_session"] } }] }, include: { client: true }, orderBy: [{ nextActionDueAt: "asc" }, { updatedAt: "asc" }], take: 20 }),
    prisma.appointment.findMany({ where: { startsAt: { gte: end, lte: soon }, status: { in: ["confirmed", "proposed", "requested"] } }, include: { project: { include: { client: true } } }, orderBy: { startsAt: "asc" }, take: 8 }),
    prisma.projectMessage.findMany({ where: { author: "client", readAt: null }, include: { project: { include: { client: true } } }, orderBy: { createdAt: "asc" }, take: 30 }),
    prisma.directMessage.findMany({ where: { author: "client", readAt: null }, include: { client: true }, orderBy: { createdAt: "asc" }, take: 30 }),
    prisma.googleCalendarEventSync.count({ where: { syncStatus: { in: ["ERROR", "CONFLICT"] } } }),
    prisma.waitlistEntry.findMany({ where: { status: { in: ["active", "offered"] } }, include: { client: true, project: { select: { title: true } } }, orderBy: { createdAt: "asc" }, take: 20 }),
  ]);

  const actions: ActionItem[] = [];
  const latestUnreadByProject = new Map(unreadMessages.map((message) => [message.projectId, message]));
  for (const message of latestUnreadByProject.values()) actions.push({ key: `message-${message.projectId}`, priority: message.createdAt <= staleMessage ? 1 : 2, label: message.createdAt <= staleMessage ? "ODPOWIEDŹ PILNA" : "NOWA WIADOMOŚĆ", title: `${message.project.client.firstName} ${message.project.client.lastName} · ${message.project.title}`, detail: message.body || "Klient wysłał załącznik.", href: `/admin/clients/${message.project.client.id}?view=messages`, dueAt: message.createdAt });
  const latestUnreadByClient = new Map(unreadDirectMessages.map((message) => [message.clientId, message]));
  for (const message of latestUnreadByClient.values()) actions.push({ key: `direct-message-${message.clientId}`, priority: message.createdAt <= staleMessage ? 1 : 2, label: message.createdAt <= staleMessage ? "ODPOWIEDŹ PILNA" : "NOWA WIADOMOŚĆ", title: `${message.client.firstName} ${message.client.lastName} · wiadomość ogólna`, detail: message.body, href: `/admin/clients/${message.clientId}?view=messages`, dueAt: message.createdAt });
  for (const project of actionProjects) {
    const fallback: Record<string, string> = { awaiting_client: "Sprawdź, jakich informacji brakuje klientowi.", awaiting_confirmation: "Sprawdź i potwierdź wybrany termin.", awaiting_deposit: "Sprawdź status zadatku.", confirmed: "Przygotuj projekt lub szczegóły najbliższej sesji.", awaiting_next_session: "Dodaj kolejną sesję albo zamknij projekt." };
    const overdue = project.nextActionDueAt ? project.nextActionDueAt < now : false;
    actions.push({ key: `project-${project.id}`, priority: overdue ? 1 : 2, label: project.kind === "consultation" ? "KONSULTACJA" : overdue ? "PO TERMINIE" : "NASTĘPNE DZIAŁANIE", title: `${project.client.firstName} ${project.client.lastName} · ${project.title}`, detail: project.nextAction || fallback[project.status] || ADMIN_STATUS_LABEL[project.status as keyof typeof ADMIN_STATUS_LABEL] || "Sprawdź projekt.", href: `/admin/clients/${project.client.id}?view=projects`, dueAt: project.nextActionDueAt });
  }
  for (const project of newProjects) if (!actions.some((item) => item.key === `project-${project.id}`)) actions.push({ key: `project-${project.id}`, priority: project.createdAt <= staleMessage ? 1 : 2, label: project.kind === "consultation" ? "NOWA KONSULTACJA" : "NOWE ZGŁOSZENIE", title: `${project.client.firstName} ${project.client.lastName} · ${project.title}`, detail: project.description, href: `/admin/clients/${project.client.id}?view=projects`, dueAt: project.createdAt });
  for (const entry of waitlistEntries) {
    const expired = entry.status === "offered" && entry.offerExpiresAt && entry.offerExpiresAt < now;
    actions.push({ key: `waitlist-${entry.id}`, priority: expired ? 1 : 3, label: expired ? "OFERTA WYGASŁA" : entry.status === "offered" ? "LISTA · OCZEKUJE NA ODPOWIEDŹ" : "LISTA REZERWOWA", title: `${entry.client.firstName} ${entry.client.lastName} · ${entry.project.title}`, detail: expired ? "Zwolnij propozycję i zaoferuj kolejny termin." : entry.status === "offered" ? "Termin jest tymczasowo zablokowany dla klienta." : "Klient czeka na pasujący zwolniony termin.", href: "/admin/waitlist", dueAt: entry.offerExpiresAt ?? entry.createdAt });
  }
  if (syncIssues > 0) actions.push({ key: "calendar-sync", priority: 1, label: "KALENDARZ", title: `${syncIssues} ${syncIssues === 1 ? "problem synchronizacji" : "problemy synchronizacji"}`, detail: "Sprawdź połączenie z Kalendarzem Google, aby uniknąć rozbieżności terminów.", href: "/admin/calendar" });
  actions.sort((a, b) => a.priority - b.priority || (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER));

  return <div className="studio-page">
    {access === "denied" && <div role="alert" className="border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">Twoja rola nie ma dostępu do tego obszaru. Możesz nadal korzystać z dostępnych funkcji operacyjnych.</div>}
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="studio-eyebrow">CENTRUM DOWODZENIA</p><h1 className="studio-page-title">Co wymaga Twojej uwagi?</h1><p className="studio-page-description">Najważniejsze sprawy są ustawione według pilności.</p></div><div className="flex gap-2"><div className="min-w-24 border border-red-400/35 bg-red-500/5 px-3 py-2"><p className="text-[9px] tracking-[.1em] text-red-200">PILNE</p><p className="mt-0.5 font-display text-2xl">{actions.filter((item) => item.priority === 1).length}</p></div><div className="min-w-24 border border-ink-white/15 bg-ink-charcoal/25 px-3 py-2"><p className="text-[9px] tracking-[.1em] text-ink-grey">DO ZROBIENIA</p><p className="mt-0.5 font-display text-2xl">{actions.length}</p></div></div></header>

    <section className="border border-ink-white/10 bg-ink-charcoal/35 p-4"><div className="flex justify-between gap-4"><div><p className="text-[10px] tracking-widest text-ink-gold">DZISIEJSZE WIZYTY</p><h2 className="mt-1 font-display text-2xl">Plan dnia</h2></div><Link href="/admin/calendar" className="text-[10px] tracking-[.08em] text-ink-gold">KALENDARZ →</Link></div><div className="mt-3 divide-y divide-ink-white/10">{today.length ? today.map((item) => <Link key={item.id} href={`/admin/clients/${item.project.client.id}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[90px_1fr_auto]"><p className="text-ink-gold">{formatCoolinkTime(item.startsAt)}–{formatCoolinkTime(item.endsAt)}</p><p><strong>{item.project.client.firstName} {item.project.client.lastName}</strong><span className="mt-0.5 block text-xs text-ink-grey">{item.project.kind === "consultation" ? "Konsultacja" : item.project.title} · {duration(item.startsAt, item.endsAt)}</span></p><StatusBadge status={item.status} /></Link>) : <p className="py-4 text-sm text-ink-grey">Brak wizyt na dziś.</p>}</div></section>

    <section className="border border-ink-white/10 bg-ink-charcoal/35 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] tracking-widest text-ink-gold">KOLEJKA DZIAŁAŃ</p><h2 className="mt-1 font-display text-2xl">Następne kroki</h2></div><span className="border border-ink-white/10 px-2 py-1 text-xs text-ink-grey">{actions.length}</span></div><div className="mt-3 grid gap-2 xl:grid-cols-2">{actions.slice(0, 14).map((item) => <Link key={item.key} href={item.href} className={`border-l-2 p-3 transition-colors hover:bg-ink-white/5 ${item.priority === 1 ? "border-red-400 bg-red-500/5" : "border-ink-gold bg-ink-gold/5"}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className={`text-[10px] tracking-[.1em] ${item.priority === 1 ? "text-red-200" : "text-ink-gold"}`}>{item.label}</p>{item.dueAt && <time className="text-[10px] text-ink-grey">{fmt(item.dueAt)}</time>}</div><p className="mt-1.5 text-sm text-ink-white">{item.title}</p><p className="mt-1 line-clamp-1 text-xs leading-relaxed text-ink-grey">{item.detail}</p></Link>)}{actions.length === 0 && <div className="border border-emerald-400/25 bg-emerald-400/5 p-4 text-sm text-emerald-200">Wszystko jest pod kontrolą.</div>}</div></section>

    <section className="border border-ink-white/10 bg-ink-charcoal/35 p-4"><p className="text-[10px] tracking-widest text-ink-gold">NAJBLIŻSZE 14 DNI</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">{upcoming.map((item) => <Link key={item.id} href={`/admin/clients/${item.project.client.id}`} className="border border-ink-white/10 p-3 hover:border-ink-gold"><p className="text-sm">{item.project.client.firstName} {item.project.client.lastName}</p><p className="mt-0.5 truncate text-xs text-ink-grey">{item.project.kind === "consultation" ? "Konsultacja" : item.project.title}</p><p className="mt-2 text-[10px] text-ink-gold">{fmt(item.startsAt)} · {duration(item.startsAt, item.endsAt)}</p></Link>)}{upcoming.length === 0 && <p className="text-sm text-ink-grey">Brak kolejnych wizyt w tym okresie.</p>}</div></section>
  </div>;
}
