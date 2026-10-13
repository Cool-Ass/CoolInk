import { reservedLoyaltyRules, reservedStampCost } from "@/lib/voucherRules";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loyaltySummary } from "@/lib/loyaltyRules";
import { getLoyaltyRules, getLoyaltyDescription } from "@/lib/loyaltySettings";
import { pendingLoyaltyCorrections } from "@/lib/loyaltyCorrections";

export async function loyaltyBalance(clientId: string, db: Prisma.TransactionClient = prisma) {
  const result = await db.loyaltyEntry.aggregate({ where: { clientId, voidedAt: null }, _sum: { stamps: true } });
  return result._sum.stamps ?? 0;
}

export async function availableLoyaltyReward(clientId: string, db: Prisma.TransactionClient = prisma) {
  const [balance, rules, reserved] = await Promise.all([loyaltyBalance(clientId, db), getLoyaltyRules(db), db.appointment.findMany({ where: { loyaltyReserved: true, status: { in: ["requested", "proposed", "confirmed", "completed"] }, project: { clientId }, loyaltyEntry: { is: null } }, select: { loyaltyReservation: true } })]);
  return balance >= reservedStampCost(reserved, rules) + rules.stampsRequired ? { discountPercent: rules.discountPercent, maxDiscountCents: rules.maxDiscountCents, rules } : null;
}

/** A cancelled reservation releases its stamps; reactivation must claim them again under the calendar lock. */
export async function assertLoyaltyVisitReactivation(db: Prisma.TransactionClient, appointmentId: string, clientId: string, status: string) {
  if (["cancelled", "no_show"].includes(status)) return;
  const visit = await db.appointment.findUnique({ where: { id: appointmentId }, select: { status: true, loyaltyReserved: true, loyaltyReservation: true } });
  if (!visit?.loyaltyReserved || !["cancelled", "no_show"].includes(visit.status)) return;
  const [balance, current, reserved] = await Promise.all([loyaltyBalance(clientId, db), getLoyaltyRules(db), db.appointment.findMany({ where: { id: { not: appointmentId }, loyaltyReserved: true, status: { in: ["requested", "proposed", "confirmed", "completed"] }, project: { clientId }, loyaltyEntry: { is: null } }, select: { loyaltyReservation: true } })]);
  const cost = (reservedLoyaltyRules(visit.loyaltyReservation) ?? current).stampsRequired;
  if (balance < reservedStampCost(reserved, current) + cost) throw Error("LOYALTY_RESERVATION_UNAVAILABLE");
}

export async function getLoyaltyCard(clientId: string) {
  const [balance, history, rules, description] = await Promise.all([
    loyaltyBalance(clientId),
    prisma.loyaltyEntry.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, kind: true, stamps: true, paidCents: true, discountCents: true, voucherCents: true, note: true, createdAt: true, voidedAt: true } }),
    getLoyaltyRules(),
    getLoyaltyDescription(),
  ]);
  const pendingCorrections = await pendingLoyaltyCorrections(clientId);
  return { ...loyaltySummary(balance, rules), rules, description, pendingCorrections: pendingCorrections.map((entry) => ({ id: entry.id, note: entry.note, voidedAt: entry.voidedAt.toISOString() })), history: history.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), voidedAt: item.voidedAt?.toISOString() ?? null })) };
}
