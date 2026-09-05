import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const money = (value: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(value);

export default async function StatisticsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const [clients, newClientsMonth, appointments, projects, inventory] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.appointment.findMany({ where: { startsAt: { gte: yearStart } }, select: { startsAt: true, status: true, price: true } }),
    prisma.tattooProject.findMany({ where: { createdAt: { gte: yearStart } }, select: { styles: true, finalPrice: true, status: true } }),
    prisma.inventoryItem.findMany({ where: { active: true }, select: { quantity: true, minimumStock: true, unitCostCents: true } }),
  ]);
  const completed = appointments.filter((item) => item.status === "completed");
  const monthRevenue = completed.filter((item) => item.startsAt >= monthStart).reduce((sum, item) => sum + (item.price ?? 0), 0);
  const yearRevenue = completed.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const upcoming = appointments.filter((item) => item.startsAt >= now && ["confirmed", "deposit_paid", "deposit_required"].includes(item.status)).length;
  const noShows = appointments.filter((item) => item.status === "no_show").length;
  const statusCounts = Object.entries(appointments.reduce<Record<string, number>>((all, item) => ({ ...all, [item.status]: (all[item.status] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const styles = Object.entries(projects.flatMap((project) => project.styles.split(",").map((style) => style.trim()).filter(Boolean)).reduce<Record<string, number>>((all, style) => ({ ...all, [style]: (all[style] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxStatus = Math.max(1, ...statusCounts.map(([, value]) => value));
  const maxStyle = Math.max(1, ...styles.map(([, value]) => value));
  const stockValue = inventory.reduce((sum, item) => sum + item.quantity * (item.unitCostCents ?? 0), 0) / 100;
  const lowStock = inventory.filter((item) => item.quantity <= item.minimumStock).length;
  const labels: Record<string, string> = { requested: "Prośby", proposed: "Zaproponowane", confirmed: "Potwierdzone", deposit_required: "Oczekuje zadatku", deposit_paid: "Zadatek opłacony", completed: "Zrealizowane", cancelled: "Anulowane", no_show: "Nieobecności" };
  const cards = [["PRZYCHÓD W MIESIĄCU", money(monthRevenue)], ["PRZYCHÓD W ROKU", money(yearRevenue)], ["KLIENCI", String(clients)], ["NOWI W MIESIĄCU", String(newClientsMonth)], ["NADCHODZĄCE WIZYTY", String(upcoming)], ["NISKIE STANY", String(lowStock)], ["WARTOŚĆ MAGAZYNU", money(stockValue)], ["NIEOBECNOŚCI W ROKU", String(noShows)]];
  return <div className="space-y-8"><header><p className="text-[11px] tracking-[.18em] text-ink-gold">ANALITYKA STUDIA</p><h1 className="mt-2 font-display text-4xl">Statystyki</h1><p className="mt-2 text-sm text-ink-grey">Bieżący obraz klientów, wizyt, finansów i magazynu. Przychód uwzględnia zrealizowane wizyty z wpisaną ceną.</p></header><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <article key={label} className="border border-ink-white/15 bg-ink-charcoal/35 p-5"><p className="text-[10px] tracking-[.13em] text-ink-grey">{label}</p><p className="mt-3 font-display text-3xl text-ink-gold">{value}</p></article>)}</section><section className="grid gap-5 xl:grid-cols-2"><Chart title="Wizyty w bieżącym roku" rows={statusCounts.map(([label, value]) => [labels[label] ?? label, value])} max={maxStatus} empty="Brak wizyt w tym roku." /><Chart title="Najczęściej wybierane style" rows={styles} max={maxStyle} empty="Uzupełniaj style projektów, aby zobaczyć ranking." /></section></div>;
}

function Chart({ title, rows, max, empty }: { title: string; rows: [string, number][]; max: number; empty: string }) {
  return <section className="border border-ink-white/15 bg-ink-charcoal/35 p-5"><h2 className="font-display text-2xl">{title}</h2>{rows.length ? <div className="mt-5 space-y-4">{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span className="text-ink-grey">{label}</span><span>{value}</span></div><div className="h-2 bg-ink-white/10"><div className="h-full bg-ink-gold" style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-ink-grey">{empty}</p>}</section>;
}
