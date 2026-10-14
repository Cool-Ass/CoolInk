import { prisma } from "@/lib/prisma";
export type ForecastVisit = { price: number | null; depositStatus: string; depositAmount: number | null; voucher?: { amountCents: number; cancelledAt: Date | null; redeemedAt: Date | null } | null };
export function forecastReceipts(visits: ForecastVisit[]) {
  return visits.reduce((total, visit) => {
    if (visit.price === null) { total.unpriced++; return total; }
    total.priced++;
    total.grossCents += visit.price * 100;
    total.remainingCents += Math.max(0, visit.price * 100 - (visit.voucher && !visit.voucher.cancelledAt && !visit.voucher.redeemedAt ? visit.voucher.amountCents : 0) - (visit.depositStatus === "paid" ? (visit.depositAmount || 0) * 100 : 0));
    return total;
  }, { grossCents: 0, remainingCents: 0, priced: 0, unpriced: 0 });
}
export async function businessReports(from: Date, now: Date) {
  const [returning, work, promotions, forecast] = await Promise.all([
    // Returning means a completed tattoo in the window with an earlier completed
    // tattoo anywhere in history, not just two visits inside this window.
    prisma.$queryRaw<{ clients: number }[]>`
      SELECT count(DISTINCT p."clientId")::int AS clients
      FROM "Appointment" a JOIN "TattooProject" p ON p.id = a."projectId"
      WHERE a.status = 'completed' AND (a."serviceType" IS NULL OR a."serviceType" = 'tattoo') AND p.kind = 'tattoo' AND a."startsAt" >= ${from} AND a."startsAt" <= ${now}
      AND EXISTS (
        SELECT 1 FROM "Appointment" old JOIN "TattooProject" op ON op.id = old."projectId"
        WHERE op."clientId" = p."clientId" AND op.kind = 'tattoo' AND old.status = 'completed' AND (old."serviceType" IS NULL OR old."serviceType" = 'tattoo')
        AND old."startsAt" < a."startsAt"
      )
    `,
    prisma.$queryRaw<{ paidCents: number; minutes: number; missingSessions: number }[]>`
      SELECT COALESCE(sum(CASE WHEN a.id IS NOT NULL AND a."endsAt" > a."startsAt" THEN e."paidCents" ELSE 0 END), 0)::float8 AS "paidCents",
        COALESCE(sum(CASE WHEN a.id IS NOT NULL AND a."endsAt" > a."startsAt" THEN extract(epoch FROM (a."endsAt" - a."startsAt")) / 60 ELSE 0 END), 0)::float8 AS minutes,
        count(*) FILTER (WHERE a.id IS NULL OR a."endsAt" <= a."startsAt")::int AS "missingSessions"
      FROM "LoyaltyEntry" e LEFT JOIN "Appointment" a ON a.id = e."appointmentId"
      WHERE e.kind = 'visit' AND e."voidedAt" IS NULL AND e."createdAt" >= ${from} AND e."createdAt" <= ${now}
    `,
    prisma.$queryRaw<{ id: string; title: string; requests: number; completed: number; cancelled: number; paidCents: number }[]>`
      SELECT p.id, p.title, count(a.id)::int AS requests,
        count(a.id) FILTER (WHERE a.status = 'completed')::int AS completed,
        count(a.id) FILTER (WHERE a.status IN ('cancelled', 'no_show'))::int AS cancelled,
        COALESCE(sum(CASE WHEN e."voidedAt" IS NULL AND e.kind = 'visit' THEN e."paidCents" ELSE 0 END), 0)::float8 AS "paidCents"
      FROM "Promotion" p JOIN "Appointment" a ON a."promotionId" = p.id
      LEFT JOIN "LoyaltyEntry" e ON e."appointmentId" = a.id
      WHERE a."createdAt" >= ${from} AND a."createdAt" <= ${now}
      GROUP BY p.id, p.title ORDER BY count(a.id) DESC, p.id LIMIT 50
    `,
    prisma.appointment.findMany({ where: { startsAt: { gt: now, lte: new Date(now.getTime() + 30 * 86400000) }, status: { in: ["confirmed", "deposit_required", "deposit_paid"] }, loyaltyEntry: { is: null }, OR: [{ serviceType: null }, { serviceType: "tattoo" }], project: { kind: "tattoo" } }, select: { price: true, depositStatus: true, depositAmount: true, voucher: { select: { amountCents: true, cancelledAt: true, redeemedAt: true } } } }),
  ]);
  const hours = (work[0]?.minutes || 0) / 60;
  return { returningClients: returning[0]?.clients || 0, workHours: hours, hourlyCents: hours ? Math.round(work[0].paidCents / hours) : null, missingSessions: work[0]?.missingSessions || 0, promotions, forecast: forecastReceipts(forecast) };
}
