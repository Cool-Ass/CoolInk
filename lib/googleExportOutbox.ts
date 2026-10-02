import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function claimGoogleExport(appointmentId: string) {
  const key = `google_retry:${appointmentId}`;
  // Manual sync of historical visits may have no marker. Never overwrite a
  // marker already committed by a newer appointment mutation or another worker.
  const value = JSON.stringify({ appointmentId, queuedAt: new Date().toISOString(), nonce: randomUUID() });
  await prisma.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  const lease = randomUUID();
  const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
    UPDATE "SiteSetting" SET "value" = ("value"::jsonb || jsonb_build_object(
      'lease', ${lease}, 'leaseUntil', now() + interval '2 minutes'))::text
    WHERE "key" = ${key}
      AND COALESCE(("value"::jsonb->>'leaseUntil')::timestamptz, '-infinity'::timestamptz) < now()
      AND COALESCE(("value"::jsonb->>'nextAttemptAt')::timestamptz, '-infinity'::timestamptz) <= now()
    RETURNING "key", "value"
  `;
  const row = rows[0];
  if (!row) return null;
  const parsed = JSON.parse(row.value) as { nonce: string };
  return { ...row, nonce: parsed.nonce };
}

export type GoogleExportFailure = "EXPORT_FAILED" | "CONFIGURATION_REQUIRED" | "REMOTE_CONFLICT";

export async function googleExportQueueStatus() {
  const [row] = await prisma.$queryRaw<Array<{ pending: number; failed: number; conflicts: number; configuration: number; oldestQueuedAt: Date | null }>>`
    SELECT count(*)::int AS pending,
      count(*) FILTER (WHERE "value"::jsonb->>'lastError' = 'EXPORT_FAILED')::int AS failed,
      count(*) FILTER (WHERE "value"::jsonb->>'lastError' = 'REMOTE_CONFLICT')::int AS conflicts,
      count(*) FILTER (WHERE "value"::jsonb->>'lastError' = 'CONFIGURATION_REQUIRED')::int AS configuration,
      min(COALESCE(("value"::jsonb->>'queuedAt')::timestamptz, "updatedAt")) AS "oldestQueuedAt"
    FROM "SiteSetting" WHERE "key" LIKE 'google_retry:%'
  `;
  return row;
}

export function googleExportRetry(attempts: number, failure: GoogleExportFailure, now = Date.now()) {
  const nextAttempts = Math.min(1000, Math.max(0, Number.isFinite(attempts) ? Math.trunc(attempts) : 0) + 1);
  const delay = failure === "EXPORT_FAILED" ? Math.min(3600, 60 * 2 ** Math.min(nextAttempts - 1, 6)) : 3600;
  return { attempts: nextAttempts, nextAttemptAt: new Date(now + delay * 1000).toISOString(), lastError: failure };
}

export async function releaseGoogleExport(claim: { key: string; value: string }, completed: boolean, failure: GoogleExportFailure = "EXPORT_FAILED") {
  if (completed) {
    await prisma.siteSetting.deleteMany({ where: { key: claim.key, value: claim.value } });
  } else {
    const previous = JSON.parse(claim.value) as { attempts?: number };
    // Store only a fixed error code, never OAuth/network exceptions or payloads.
    const retry = JSON.stringify(googleExportRetry(previous.attempts ?? 0, failure));
    // The value predicate protects a newer mutation/claim from this worker.
    await prisma.$executeRaw`
      UPDATE "SiteSetting" SET "value" = (("value"::jsonb - 'lease' - 'leaseUntil') || ${retry}::jsonb)::text
      WHERE "key" = ${claim.key} AND "value" = ${claim.value}
    `;
  }
}
