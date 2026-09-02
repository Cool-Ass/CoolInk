import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";
import { getActiveTattooStyleLabels } from "@/lib/tattooStyles";

export const dynamic = "force-dynamic";

export default async function PortalCalendarPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking } = await searchParams;
  const [projects, calendar, tattooStyles] = await Promise.all([
    prisma.tattooProject.findMany({ where: { clientId: current.id, status: { not: "cancelled" } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    getPublicCalendarData(true),
    getActiveTattooStyleLabels(),
  ]);
  return <div><p className="text-[11px] tracking-[.18em] text-ink-gold">KALENDARZ</p><h1 className="mt-2 font-display text-4xl">Wolne terminy</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-grey">Widoczne są tylko terminy, które studio oznaczyło jako wolne.</p><ClientBookingCalendar {...calendar} projects={projects} tattooStyles={tattooStyles} initialStartsAt={booking} /></div>;
}
