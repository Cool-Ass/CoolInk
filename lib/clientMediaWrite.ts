import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PRIVACY_LOCKED_STATUSES } from "@/lib/privacyExecutionPlan";
import { deletePrivateProjectMedia } from "@/lib/privateMedia";
import { randomUUID } from "node:crypto";

/** A bounded media upload shares the erasure lock through upload + DB commit.
 * Roll back a failed savepoint while retaining the lock for exact-object cleanup.
 * A failed cleanup is a private durable retry marker, never an invisible orphan. */
export async function withClientMediaWrite<T>(clientId: string, work: (tx: Prisma.TransactionClient, track: (location: string) => void) => Promise<T>) {
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"privacy:" + clientId}, 0))`;
    const privacy = await tx.accountDeletionRequest.findUnique({ where: { clientId }, select: { status: true } });
    if (privacy && PRIVACY_LOCKED_STATUSES.includes(privacy.status)) throw new Error("Profil jest zablokowany na czas wykonania wniosku o dane.");
    const locations: string[] = [];
    await tx.$executeRawUnsafe("SAVEPOINT media_write");
    try {
      const value = await work(tx, location => locations.push(location));
      await tx.$executeRawUnsafe("RELEASE SAVEPOINT media_write");
      return { ok: true as const, value };
    } catch {
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT media_write");
      const cleanup = await deletePrivateProjectMedia(locations);
      if (cleanup.failures.length) {
        const key = `internal.mediaCleanup:${clientId}:${randomUUID()}`;
        await tx.siteSetting.create({ data: { key, value: JSON.stringify(cleanup.failures) } });
      }
      return { ok: false as const };
    }
  }, { timeout: 55_000, maxWait: 10_000 });
  if (!result.ok) throw new Error("Nie udało się zapisać pliku lub wiadomości. Spróbuj ponownie.");
  return result.value;
}
