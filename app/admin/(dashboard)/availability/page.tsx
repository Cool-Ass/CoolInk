import { prisma } from "@/lib/prisma";
import AvailabilityManager from "@/components/admin/AvailabilityManager";

export const dynamic = "force-dynamic";

const defaults = Array.from({ length: 7 }, (_, weekday) => ({ weekday, enabled: weekday !== 0, startsAt: "10:00", endsAt: "19:00" }));

export default async function AvailabilityPage() {
  const [hours, blocks, promotions] = await Promise.all([
    prisma.workingHours.findMany({ orderBy: { weekday: "asc" } }),
    prisma.availabilityBlock.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.promotion.findMany({ where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
  ]);
  return <div className="flex flex-col gap-8"><div><p className="text-[11px] tracking-[0.16em] text-ink-gold">WIZYTY I KLIENCI</p><h1 className="mt-2 font-display text-3xl text-ink-white">Dostępność i promocje</h1><p className="mt-2 max-w-2xl text-sm text-ink-grey">Ustal swoje godziny pracy, zaplanuj dni wolne oraz przypnij promocję do wybranych terminów.</p></div><AvailabilityManager initialHours={hours.length ? hours : defaults} blocks={blocks.map((item) => ({ id: item.id, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), reason: item.reason }))} promotions={promotions.map((item) => ({ id: item.id, title: item.title, description: item.description, badge: item.badge, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), active: item.active }))} /></div>;
}
