import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { messageRecipient, visibleMessages } from "@/lib/messageVisibility";
import { coolinkDayRange, formatCoolinkDateTime, formatCoolinkTime } from "@/lib/dateTime";
import { pendingLoyaltyCorrections } from "@/lib/loyaltyCorrections";
import { getAdminSectionLayout } from "@/lib/adminSectionSettings";
import { projectActions, sortStudioActions, visitContext, type StudioAction } from "@/lib/studioActions";
import AdminSections from "@/components/admin/AdminSections";
import StudioActionQueue from "@/components/admin/StudioActionQueue";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";
const fmt = (value: Date) => formatCoolinkDateTime(value, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const { access } = await searchParams;
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  const now = new Date(); const { start, end } = coolinkDayRange(now);
  const soon = new Date(+now + 14 * 86400_000);
  const visible = visibleMessages(messageRecipient("admin", admin.id));
  const visitFields = { id: true, startsAt: true, createdAt: true, status: true, loyaltyEntry: { select: { id: true } } } as const;
  const [today, projects, upcoming, messages, direct, unpaid, corrections, waitlist, layout] = await Promise.all([
    prisma.appointment.findMany({ where: { startsAt: { gte: start, lt: end }, status: { notIn: ["cancelled", "no_show"] } }, include: { project: { include: { client: true } } }, orderBy: { startsAt: "asc" } }),
    prisma.tattooProject.findMany({ where: { clientArchivedAt: null, status: { notIn: ["completed", "cancelled"] }, OR: [{ nextAction: { not: null } }, { status: { in: ["inquiry", "reviewing", "awaiting_client", "awaiting_confirmation", "awaiting_deposit", "date_proposed", "awaiting_next_session"] } }, { appointments: { some: { status: "requested" } } }] }, include: { client: true, appointments: { select: visitFields } }, orderBy: [{ nextActionDueAt: "asc" }, { createdAt: "asc" }], take: 100 }),
    prisma.appointment.findMany({ where: { startsAt: { gte: end, lte: soon }, status: { in: ["confirmed", "proposed", "requested"] } }, include: { project: { include: { client: true } } }, orderBy: { startsAt: "asc" }, take: 8 }),
    prisma.projectMessage.findMany({ where: { ...visible, author: "client", readAt: null }, include: { project: { include: { client: true, appointments: { select: visitFields } } } }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.directMessage.findMany({ where: { ...visible, author: "client", readAt: null }, include: { client: true }, orderBy: { createdAt: "asc" }, take: 100 }),
    hasAdminPermission(admin.role, "finance.manage") ? prisma.appointment.findMany({ where: { status: "completed", loyaltyEntry: null, project: { kind: "tattoo" }, OR: [{ serviceType: null }, { serviceType: "tattoo" }] }, include: { project: { include: { client: true } } }, orderBy: { startsAt: "asc" }, take: 100 }) : [],
    hasAdminPermission(admin.role, "finance.manage") ? pendingLoyaltyCorrections() : [],
    prisma.waitlistEntry.findMany({ where: { status: { in: ["active", "offered"] } }, include: { client: true, project: { select: { title: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    getAdminSectionLayout(admin.id, "dashboard"),
  ]);
  const actions: StudioAction[] = projects.flatMap(p => projectActions(p, now));
  const seen = new Set<string>();
  for (const message of messages) {
    if (seen.has(message.projectId)) continue; seen.add(message.projectId);
    actions.push({ key: `message-${message.projectId}`, group: "messages", priority: +message.createdAt < +now - 12 * 3600_000 ? 1 : 2, title: `${message.project.client.firstName} ${message.project.client.lastName} · ${message.project.title}`, detail: message.body || "Klient wysłał załącznik.", href: `/admin/clients/${message.project.clientId}?view=messages`, cta: "Odpowiedz", receivedAt: message.createdAt, visitAt: visitContext(message.project.appointments, now) });
  }
  seen.clear();
  for (const message of direct) {
    if (seen.has(message.clientId)) continue; seen.add(message.clientId);
    actions.push({ key: `direct-${message.clientId}`, group: "messages", priority: +message.createdAt < +now - 12 * 3600_000 ? 1 : 2, title: `${message.client.firstName} ${message.client.lastName}`, detail: message.body || "Klient wysłał załącznik.", href: `/admin/clients/${message.clientId}?view=messages`, cta: "Odpowiedz", receivedAt: message.createdAt });
  }
  for (const visit of unpaid) actions.push({ key: `settle-${visit.id}`, group: "settlements", priority: 2, title: `${visit.project.client.firstName} ${visit.project.client.lastName} · ${visit.project.title}`, detail: "Zakończona wizyta czeka na rozliczenie.", cta: "Rozlicz wizytę", href: `/admin/clients/${visit.project.clientId}?view=appointments&settle=${encodeURIComponent(visit.id)}`, visitAt: visit.startsAt, visitLabel: "Zakończona wizyta" });
  for (const correction of corrections) actions.push({ key: `correction-${correction.id}`, group: "settlements", priority: 1, title: `${correction.firstName} ${correction.lastName}`, detail: correction.note, cta: "Wyjaśnij korektę", href: `/admin/clients/${correction.clientId}`, dueAt: correction.voidedAt });
  for (const entry of waitlist) actions.push({ key: `waitlist-${entry.id}`, group: "waiting", priority: entry.offerExpiresAt && entry.offerExpiresAt < now ? 1 : 3, title: `${entry.client.firstName} ${entry.client.lastName} · ${entry.project.title}`, detail: entry.status === "offered" ? "Oferta terminu na liście rezerwowej" : "Oczekuje na wolny termin", cta: "Otwórz listę", href: "/admin/waitlist", dueAt: entry.offerExpiresAt, receivedAt: entry.createdAt });
  const ordered = sortStudioActions(actions);
  const visits = (items: typeof today, empty: string) => <section><div className="divide-y divide-ink-white/10">{items.map(visit => <Link key={visit.id} href={`/admin/calendar?appointment=${encodeURIComponent(visit.id)}`} className="flex flex-wrap items-center gap-3 py-3 text-sm"><time dateTime={visit.startsAt.toISOString()} className="min-w-24 text-ink-gold">{items === today ? `${formatCoolinkTime(visit.startsAt)}–${formatCoolinkTime(visit.endsAt)}` : fmt(visit.startsAt)}</time><div className="min-w-0 flex-1"><p className="font-medium">{visit.project.client.firstName} {visit.project.client.lastName}</p><p className="mt-1 text-xs text-ink-grey">{visit.project.title}</p></div><StatusBadge status={visit.status} /></Link>)}{!items.length && <p className="py-4 text-sm text-ink-grey">{empty}</p>}</div></section>;
  return <div className="studio-page w-full min-w-0">
    {access === "denied" && <p role="alert" className="text-sm text-amber-200">Twoja rola nie ma dostępu do tego obszaru.</p>}
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="studio-page-title">Dziś w studio</h1><p className="mt-1 text-sm text-ink-grey">{formatCoolinkDateTime(now, { weekday: "long", day: "numeric", month: "long" })}</p></div><div className="flex flex-wrap items-center gap-4 text-sm"><span>{today.length} wizyt dziś</span><span>{actions.filter(a => a.priority === 1).length} pilnych spraw</span>{admin.role === "owner" && <Link href="/admin/settings#system-health" className="text-ink-grey hover:text-ink-gold">Stan systemu →</Link>}</div></header>
    <AdminSections scope="dashboard" initial={layout} masonry sections={[
      { id: "today", title: "Plan dnia", content: visits(today, "Brak wizyt na dziś.") },
      { id: "actions", title: "Wymaga decyzji", content: <StudioActionQueue items={ordered.map(item => ({ ...item, visitAt: item.visitAt?.toISOString(), dueAt: item.dueAt?.toISOString(), receivedAt: item.receivedAt?.toISOString() }))} /> },
      { id: "upcoming", title: "Najbliższe wizyty", content: visits(upcoming, "Brak wizyt w najbliższych 14 dniach.") },
    ]} />
    {projects.length === 100 && <p className="text-xs text-ink-grey">Wyświetlono pierwsze 100 aktywnych spraw. Wszystkie znajdziesz w zakładce Klienci.</p>}
  </div>;
}
