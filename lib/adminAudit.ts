import { prisma } from "@/lib/prisma";

export async function writeAdminAudit({
  adminUserId,
  action,
  targetType,
  targetId,
  summary,
  metadata,
}: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: unknown;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminUserId,
      action,
      targetType,
      targetId: targetId ?? null,
      summary: summary.slice(0, 500),
      metadata: metadata === undefined ? null : JSON.stringify(metadata).slice(0, 10_000),
    },
  });
}
