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
    RETURNING "key", "value"
  `;
  const row = rows[0];
  if (!row) return null;
  const parsed = JSON.parse(row.value) as { nonce: string };
  return { ...row, nonce: parsed.nonce };
}

export async function releaseGoogleExport(claim: { key: string; value: string }, completed: boolean) {
  if (completed) {
    await prisma.siteSetting.deleteMany({ where: { key: claim.key, value: claim.value } });
  } else {
    // The value predicate protects a newer mutation/claim from this worker.
    await prisma.$executeRaw`
      UPDATE "SiteSetting" SET "value" = ("value"::jsonb - 'lease' - 'leaseUntil')::text
      WHERE "key" = ${claim.key} AND "value" = ${claim.value}
    `;
  }
}
