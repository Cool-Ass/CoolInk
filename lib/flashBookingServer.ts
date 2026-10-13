import type { Prisma } from "@prisma/client";
import { flashClaimWhere } from "@/lib/flashBooking";

// Caller holds the canonical calendar transaction lock, shared by admin edits.
export async function resolveFlashBooking(tx: Prisma.TransactionClient, id: string, updatedAt: unknown, startsAt: Date, endsAt: Date) {
  const flash = await tx.portfolioItem.findUnique({ where: { id }, include: { flashProjects: { where: flashClaimWhere, take: 1, select: { id: true } } } });
  if (!flash?.published || !flash.flashEnabled || !flash.flashPrice || !flash.flashSize) throw Error("FLASH_UNAVAILABLE");
  if (flash.updatedAt.toISOString() !== updatedAt) throw Error("FLASH_CHANGED");
  if (flash.flashUnique && flash.flashProjects.length) throw Error("FLASH_CLAIMED");
  if (endsAt.getTime() - startsAt.getTime() !== flash.flashDurationMinutes * 60000) throw Error("FLASH_DURATION");
  return flash;
}
