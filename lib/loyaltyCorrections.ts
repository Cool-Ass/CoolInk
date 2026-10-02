import { prisma } from "@/lib/prisma";

export const LOYALTY_CORRECTION_RESOLVED = "loyalty.correction_resolved";

/** A voided payment remains visible until finance explicitly records its resolution. */
export async function pendingLoyaltyCorrections(clientId?: string) {
  return prisma.$queryRaw<Array<{ id: string; clientId: string; firstName: string; lastName: string; note: string; voidedAt: Date }>>`
    SELECT e."id", e."clientId", c."firstName", c."lastName", e."note", e."voidedAt"
    FROM "LoyaltyEntry" e JOIN "Client" c ON c."id" = e."clientId"
    WHERE e."kind" = 'visit' AND e."voidedAt" IS NOT NULL
      AND (${clientId ?? null}::text IS NULL OR e."clientId" = ${clientId ?? null})
      AND NOT EXISTS (
        SELECT 1 FROM "AdminAuditLog" a
        WHERE a."action" = ${LOYALTY_CORRECTION_RESOLVED}
          AND a."targetType" = 'LoyaltyEntry' AND a."targetId" = e."id"
      )
    ORDER BY e."voidedAt" ASC LIMIT 50
  `;
}
