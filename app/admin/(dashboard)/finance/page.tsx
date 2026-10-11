import Link from "next/link";
import { requireAdminPage } from "@/lib/adminPage";
import { prisma } from "@/lib/prisma";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { pendingLoyaltyCorrections } from "@/lib/loyaltyCorrections";

export const dynamic = "force-dynamic";
const money = (cents: number) => (cents / 100).toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
export default async function FinancePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdminPage("finance.manage");
  const period = (await searchParams).period === "90" ? 90 : 30;
  const since = new Date(+new Date() - period * 86400_000);
  const where = { kind: "visit", voidedAt: null, createdAt: { gte: since } } as const;
  const [totals, entries, pending, corrections] = await Promise.all([
    prisma.loyaltyEntry.aggregate({ where, _sum: { paidCents: true, discountCents: true }, _count: true }),
    prisma.loyaltyEntry.findMany({ where, include: { client: { select: { id: true, firstName: true, lastName: true } }, appointment: { select: { startsAt: true, project: { select: { title: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.appointment.findMany({ where: { status: { in: ["confirmed", "completed"] }, startsAt: { lte: new Date() }, loyaltyEntry: null, project: { kind: "tattoo" }, OR: [{ serviceType: null }, { serviceType: "tattoo" }] }, include: { project: { include: { client: { select: { firstName: true, lastName: true } } } } }, orderBy: { startsAt: "asc" }, take: 50 }),
    pendingLoyaltyCorrections(),
  ]);
  return <div className="studio-page"><header className="flex flex-wrap items-center justify-between gap-3"><h1 className="studio-page-title">Finanse</h1><nav aria-label="Okres rozliczeń" className="flex gap-1">{[30,90].map(days => <Link key={days} aria-current={period === days ? "page" : undefined} className={`studio-view-switch ${period === days ? "is-active" : ""}`} href={`/admin/finance?period=${days}`}>{days} dni</Link>)}</nav></header>
    <div className="grid gap-3 sm:grid-cols-3">{[["Potwierdzone płatności", money(totals._sum.paidCents ?? 0)], ["Rabaty lojalnościowe", money(totals._sum.discountCents ?? 0)], ["Rozliczone wizyty", totals._count]].map(([label,value]) => <section key={label} className="studio-panel"><p className="text-xs text-ink-grey">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></section>)}</div>
    <p className="text-xs text-ink-grey">Zapisane rozliczenia wizyt tatuażu, według dnia rozliczenia. Kwoty obejmują zadatek; nie sumujemy go drugi raz. To nie jest pełna księgowość ani raport wszystkich wpłat studia.</p>
    <section className="studio-panel"><h2 className="mb-3 text-lg font-semibold">Do zakończenia / rozliczenia · {pending.length}{pending.length === 50 ? "+" : ""}</h2><div className="divide-y divide-ink-white/10">{pending.map(visit => <Link key={visit.id} href={`/admin/calendar?appointment=${visit.id}`} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{visit.project.client.firstName} {visit.project.client.lastName}<span className="mt-1 block text-xs text-ink-grey">{visit.project.title}</span></span><time dateTime={visit.startsAt.toISOString()} className="text-ink-gold">{formatCoolinkDateTime(visit.startsAt)}</time></Link>)}{!pending.length && <p className="text-sm text-ink-grey">Wszystkie rozpoczęte wizyty rozliczone.</p>}</div></section>
    {corrections.length > 0 && <section className="studio-panel"><h2 className="mb-3 text-lg font-semibold">Korekty do wyjaśnienia</h2>{corrections.map(item => <Link key={item.id} href={`/admin/clients/${item.clientId}`} className="block py-2 text-sm">{item.firstName} {item.lastName} · {item.note}</Link>)}</section>}
    <section className="studio-panel"><h2 className="mb-3 text-lg font-semibold">Ostatnie rozliczenia</h2><div className="divide-y divide-ink-white/10">{entries.map(entry => <Link key={entry.id} href={`/admin/clients/${entry.clientId}?view=appointments`} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{entry.client.firstName} {entry.client.lastName}<span className="mt-1 block text-xs text-ink-grey">{entry.appointment?.project.title ?? "Wizyta"} · {formatCoolinkDateTime(entry.appointment?.startsAt ?? entry.createdAt)}</span></span><span>{money(entry.paidCents)}<span className="mt-1 block text-xs text-ink-grey">Rozliczono {formatCoolinkDateTime(entry.createdAt)}</span></span></Link>)}{!entries.length && <p className="text-sm text-ink-grey">Brak zapisanych rozliczeń w tym okresie.</p>}</div>{entries.length === 50 && <p className="mt-3 text-xs text-ink-grey">Ostatnie 50 wpisów. Podsumowanie obejmuje cały wybrany okres.</p>}</section>
  </div>;
}
