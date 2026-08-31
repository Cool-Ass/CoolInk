import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { getPublicCalendarData } from "@/lib/publicCalendar";
import ClientBookingCalendar from "@/components/client/ClientBookingCalendar";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const current = await getCurrentClient();
  if (!current) redirect("/app");
  const { booking } = await searchParams;
  const [client, projects, calendar] = await Promise.all([
    prisma.client.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true } }),
    prisma.tattooProject.findMany({ where: { clientId: current.id, status: { not: "cancelled" } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 30 }),
    getPublicCalendarData(),
  ]);
  return <div><p className="text-[11px] tracking-[.2em] text-ink-gold">STREFA KLIENTA</p><h1 className="mt-2 font-display text-4xl sm:text-6xl">Cześć, {client.firstName}.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-grey">Wybierz wolny termin, a potem opowiedz krótko o swoim pomyśle.</p><ClientBookingCalendar {...calendar} projects={projects} initialStartsAt={booking} /></div>;
}
