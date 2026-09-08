import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/adminPage";
import { LEAD_SOURCE_LABEL, type LeadSource } from "@/lib/leadSource";

export const dynamic = "force-dynamic";

const PERIODS = [
  ["30", "30 dni"],
  ["90", "90 dni"],
  ["365", "12 miesięcy"],
  ["all", "Cały okres"],
] as const;
const CONVERTED_PROJECT_STATUSES = new Set(["awaiting_deposit", "confirmed", "designing", "in_progress", "awaiting_next_session", "completed", "accepted", "scheduled"]);
const CONVERTED_APPOINTMENT_STATUSES = new Set(["confirmed", "deposit_required", "deposit_paid", "completed"]);
const OCCUPIED_APPOINTMENT_STATUSES = new Set(["confirmed", "deposit_required", "deposit_paid", "completed"]);
const APPOINTMENT_LABELS: Record<string, string> = {
  requested: "Prośby",
  proposed: "Zaproponowane",
  confirmed: "Potwierdzone",
  deposit_required: "Oczekuje na potwierdzenie",
  deposit_paid: "Potwierdzone",
  completed: "Zrealizowane",
  cancelled: "Anulowane",
  no_show: "Nieobecności",
};

type SearchParams = Promise<{ period?: string }>;
type Range = { start: number; end: number };

export default async function StatisticsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage("finance.manage");
  const query = await searchParams;
  const period = PERIODS.some(([value]) => value === query.period) ? query.period! : "90";
  const now = new Date();
  const from = period === "all" ? new Date(0) : new Date(now.getTime() - Number(period) * 24 * 60 * 60 * 1000);
  const dateWindow = { gte: from, lte: now };

  const [allClients, newClients, appointments, upcoming, projects, inventory, waitlist, availableSlots] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: dateWindow } }),
    prisma.appointment.findMany({
      where: { startsAt: dateWindow },
      select: { projectId: true, startsAt: true, endsAt: true, status: true, createdAt: true, project: { select: { clientId: true } } },
    }),
    prisma.appointment.count({ where: { startsAt: { gt: now }, status: { in: ["confirmed", "deposit_required", "deposit_paid"] } } }),
    prisma.tattooProject.findMany({
      where: { createdAt: dateWindow },
      select: {
        id: true,
        kind: true,
        status: true,
        styles: true,
        leadSource: true,
        createdAt: true,
        messages: { where: { author: "admin" }, orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.inventoryItem.findMany({ where: { active: true }, select: { quantity: true, minimumStock: true } }),
    prisma.waitlistEntry.findMany({ where: { createdAt: dateWindow }, select: { status: true } }),
    prisma.availableSlot.findMany({ where: { startsAt: { lte: now }, endsAt: { gte: from } }, select: { startsAt: true, endsAt: true } }),
  ]);

  const appointmentStatusesByProject = new Map<string, Set<string>>();
  for (const appointment of appointments) {
    const statuses = appointmentStatusesByProject.get(appointment.projectId) ?? new Set<string>();
    statuses.add(appointment.status);
    appointmentStatusesByProject.set(appointment.projectId, statuses);
  }
  const isConverted = (project: (typeof projects)[number]) => CONVERTED_PROJECT_STATUSES.has(project.status) || [...(appointmentStatusesByProject.get(project.id) ?? [])].some((status) => CONVERTED_APPOINTMENT_STATUSES.has(status));
  const tattooProjects = projects.filter((project) => project.kind !== "consultation");
  const consultations = projects.filter((project) => project.kind === "consultation");
  const converted = tattooProjects.filter(isConverted).length;
  const conversion = percentage(converted, tattooProjects.length);

  const completed = appointments.filter((item) => item.status === "completed");
  const cancelled = appointments.filter((item) => item.status === "cancelled").length;
  const noShows = appointments.filter((item) => item.status === "no_show").length;
  const cancellationRate = percentage(cancelled, appointments.length);
  const noShowRate = percentage(noShows, appointments.length);
  const completedByClient = completed.reduce<Map<string, number>>((result, item) => result.set(item.project.clientId, (result.get(item.project.clientId) ?? 0) + 1), new Map());
  const returningClients = [...completedByClient.values()].filter((count) => count >= 2).length;

  const answeredProjects = projects.flatMap((project) => project.messages[0] ? [(project.messages[0].createdAt.getTime() - project.createdAt.getTime()) / 3_600_000] : []);
  const responseTime = answeredProjects.length ? answeredProjects.reduce((sum, value) => sum + value, 0) / answeredProjects.length : null;
  const unanswered = projects.filter((project) => !project.messages.length && !["completed", "cancelled"].includes(project.status)).length;

  const availableRanges = mergeRanges(availableSlots.map((slot) => ({ start: Math.max(slot.startsAt.getTime(), from.getTime()), end: Math.min(slot.endsAt.getTime(), now.getTime()) })));
  const busyRanges = mergeRanges(appointments.filter((appointment) => OCCUPIED_APPOINTMENT_STATUSES.has(appointment.status)).flatMap((appointment) => availableRanges.map((available) => ({ start: Math.max(appointment.startsAt.getTime(), available.start), end: Math.min(appointment.endsAt.getTime(), available.end) })).filter((range) => range.end > range.start)));
  const availableMinutes = totalMinutes(availableRanges);
  const occupiedMinutes = totalMinutes(busyRanges);
  const utilization = availableMinutes ? Math.min(100, Math.round(occupiedMinutes / availableMinutes * 100)) : null;

  const waitlistOffered = waitlist.filter((entry) => ["offered", "booked"].includes(entry.status)).length;
  const waitlistBooked = waitlist.filter((entry) => entry.status === "booked").length;
  const waitlistEffectiveness = percentage(waitlistBooked, waitlistOffered);
  const lowStock = inventory.filter((item) => item.quantity <= item.minimumStock).length;

  const statusRows = countRows(appointments.map((appointment) => APPOINTMENT_LABELS[appointment.status] ?? appointment.status));
  const styleRows = countRows(projects.flatMap((project) => project.styles.split(",").map((style) => style.trim()).filter(Boolean))).slice(0, 7);
  const weekdayNames = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
  const weekdayRows = weekdayNames.map((name, index) => [name, appointments.filter((appointment) => !["cancelled", "no_show"].includes(appointment.status) && appointment.startsAt.getDay() === index).length] as [string, number]).filter(([, count]) => count > 0);
  const sourceRows = Object.entries(tattooProjects.reduce<Record<string, { all: number; converted: number }>>((result, project) => {
    const source = project.leadSource || "unknown";
    result[source] ??= { all: 0, converted: 0 };
    result[source].all += 1;
    if (isConverted(project)) result[source].converted += 1;
    return result;
  }, {})).map(([source, values]) => ({ source, label: source === "unknown" ? "Nie podano" : LEAD_SOURCE_LABEL[source as LeadSource] ?? source, ...values })).sort((a, b) => b.all - a.all);

  const cards = [
    { label: "NOWE ZGŁOSZENIA", value: String(tattooProjects.length), hint: `${consultations.length} konsultacji` },
    { label: "KONWERSJA NA WIZYTĘ", value: `${conversion}%`, hint: `${converted} z ${tattooProjects.length || 0} zgłoszeń` },
    { label: "ZREALIZOWANE WIZYTY", value: String(completed.length), hint: `${returningClients} klientów wróciło min. 2 razy` },
    { label: "ŚREDNI CZAS ODPOWIEDZI", value: responseTime === null ? "—" : formatHours(responseTime), hint: unanswered ? `${unanswered} bez odpowiedzi` : "Brak zaległych odpowiedzi" },
    { label: "OBŁOŻENIE TERMINÓW", value: utilization === null ? "—" : `${utilization}%`, hint: utilization === null ? "Brak historycznych wolnych terminów" : `${Math.round(occupiedMinutes / 60)} z ${Math.round(availableMinutes / 60)} godz.` },
    { label: "ANULOWANIA", value: `${cancellationRate}%`, hint: `${cancelled} wizyt` },
    { label: "NIEOBECNOŚCI", value: `${noShowRate}%`, hint: `${noShows} wizyt` },
    { label: "LISTA REZERWOWA", value: `${waitlistEffectiveness}%`, hint: `${waitlistBooked} rezerwacji z ${waitlistOffered} ofert` },
    { label: "NOWI KLIENCI", value: String(newClients), hint: `${allClients} łącznie` },
    { label: "NADCHODZĄCE WIZYTY", value: String(upcoming), hint: "Potwierdzone i oczekujące" },
    { label: "NISKIE STANY", value: String(lowStock), hint: `${inventory.length} aktywnych pozycji` },
    { label: "AKTYWNA LISTA REZERWOWA", value: String(waitlist.filter((entry) => ["active", "offered"].includes(entry.status)).length), hint: `${waitlist.length} wpisów w okresie` },
  ];

  return <div className="studio-page">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="studio-eyebrow">ANALITYKA STUDIA</p><h1 className="studio-page-title">Statystyki operacyjne</h1><p className="studio-page-description">Zgłoszenia, obsługa klientów, wizyty, obłożenie i źródła pozyskania. Finanse i płatności pozostają poza tym etapem.</p></div><nav aria-label="Zakres statystyk" className="flex flex-wrap gap-2">{PERIODS.map(([value, label]) => <Link key={value} href={`/admin/statistics?period=${value}`} className={`border px-3 py-2 text-xs ${period === value ? "border-ink-gold bg-ink-gold/10 text-ink-gold" : "border-ink-white/15 text-ink-grey hover:border-ink-white/40 hover:text-ink-white"}`}>{label}</Link>)}</nav></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.label} {...card} />)}</section>

    <section className="grid gap-4 xl:grid-cols-2">
      <Chart title="Statusy wizyt" rows={statusRows} empty="Brak wizyt w wybranym okresie." />
      <Chart title="Najczęściej wybierane style" rows={styleRows} empty="Uzupełniaj style projektów, aby zobaczyć ranking." />
      <Chart title="Ruch według dnia tygodnia" rows={weekdayRows} empty="Brak danych o wizytach." />
      <SourceChart rows={sourceRows} />
    </section>

    <section className="border border-ink-white/15 bg-ink-charcoal/35 p-5"><h2 className="font-display text-2xl">Jak czytać te dane</h2><div className="mt-4 grid gap-4 text-sm leading-relaxed text-ink-grey md:grid-cols-3"><p><span className="text-ink-white">Konwersja</span> liczy zgłoszenia, które doszły co najmniej do potwierdzonego etapu projektu lub wizyty.</p><p><span className="text-ink-white">Obłożenie</span> porównuje zajęte godziny z terminami, które studio wcześniej oznaczyło jako wolne.</p><p><span className="text-ink-white">Czas odpowiedzi</span> biegnie od utworzenia zgłoszenia do pierwszej wiadomości administratora.</p></div></section>
  </div>;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className="border border-ink-white/15 bg-ink-charcoal/35 p-4"><p className="text-[9px] tracking-[.13em] text-ink-grey">{label}</p><p className="mt-2 font-display text-3xl text-ink-gold">{value}</p><p className="mt-1 text-[11px] text-ink-grey">{hint}</p></article>;
}

function Chart({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  const max = Math.max(1, ...rows.map(([, value]) => value));
  return <section className="border border-ink-white/15 bg-ink-charcoal/35 p-5"><h2 className="font-display text-2xl">{title}</h2>{rows.length ? <div className="mt-5 space-y-4">{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span className="text-ink-grey">{label}</span><span>{value}</span></div><div className="h-2 bg-ink-white/10"><div className="h-full bg-ink-gold" style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-ink-grey">{empty}</p>}</section>;
}

function SourceChart({ rows }: { rows: { source: string; label: string; all: number; converted: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.all));
  return <section className="border border-ink-white/15 bg-ink-charcoal/35 p-5"><h2 className="font-display text-2xl">Skąd trafiają klienci</h2>{rows.length ? <div className="mt-5 space-y-4">{rows.map((row) => <div key={row.source}><div className="mb-1 flex justify-between gap-4 text-xs"><span className="text-ink-grey">{row.label}</span><span>{row.all} · konwersja {percentage(row.converted, row.all)}%</span></div><div className="h-2 bg-ink-white/10"><div className="h-full bg-emerald-400" style={{ width: `${Math.max(4, row.all / max * 100)}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-ink-grey">Nowe zgłoszenia zaczną zasilać ten ranking po wskazaniu źródła.</p>}</section>;
}

function countRows(values: string[]): [string, number][] {
  return Object.entries(values.reduce<Record<string, number>>((result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
}

function percentage(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

function formatHours(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours * 10) / 10} godz.`;
  return `${Math.round(hours / 24 * 10) / 10} dni`;
}

function mergeRanges(ranges: Range[]) {
  const sorted = ranges.filter((range) => range.end > range.start).sort((a, b) => a.start - b.start);
  return sorted.reduce<Range[]>((result, range) => {
    const previous = result.at(-1);
    if (!previous || range.start > previous.end) result.push({ ...range });
    else previous.end = Math.max(previous.end, range.end);
    return result;
  }, []);
}

function totalMinutes(ranges: Range[]) {
  return ranges.reduce((total, range) => total + (range.end - range.start) / 60_000, 0);
}
