import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loyaltySummary } from "@/lib/loyaltyRules";

export async function loyaltyBalance(clientId: string, db: Prisma.TransactionClient = prisma) {
  const result = await db.loyaltyEntry.aggregate({ where: { clientId, voidedAt: null }, _sum: { stamps: true } });
  return result._sum.stamps ?? 0;
}

export async function getLoyaltyCard(clientId: string) {
  const [balance, history] = await Promise.all([
    loyaltyBalance(clientId),
    prisma.loyaltyEntry.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, kind: true, stamps: true, paidCents: true, discountCents: true, note: true, createdAt: true, voidedAt: true } }),
  ]);
  return { ...loyaltySummary(balance), history: history.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), voidedAt: item.voidedAt?.toISOString() ?? null })) };
}
