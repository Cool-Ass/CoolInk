import { googleExportQueueStatus } from "./googleExportOutbox";
import { prisma } from "./prisma";
import { sendPushToAdmins } from "./webPush";

export const GOOGLE_QUEUE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export function staleGoogleQueue(pending: number, oldestQueuedAt: Date | null, now: number) {
  return pending > 0 && (!oldestQueuedAt || !Number.isFinite(oldestQueuedAt.getTime()) || now - oldestQueuedAt.getTime() >= GOOGLE_QUEUE_MAX_AGE_MS);
}

/** Alert at most hourly, but keep every unhealthy invocation visibly failed.
 * Provider acceptance is not a promise that the owner read the notification. */
export async function monitorGoogleQueue(now = Date.now()) {
  const status = await googleExportQueueStatus();
  if (!staleGoogleQueue(status.pending, status.oldestQueuedAt, now)) return { healthy: true, alertAttempted: false, pushAccepted: false };
  const rows = await prisma.$executeRaw`
    INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
    VALUES ('health:google_queue_alert', ${new Date(now).toISOString()}, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = EXCLUDED."updatedAt"
    WHERE "SiteSetting"."value" <= ${new Date(now - 60 * 60 * 1000).toISOString()}
  `;
  if (!rows) return { healthy: false, alertAttempted: false, pushAccepted: false };
  let pushAccepted = false;
  try {
    const result = await sendPushToAdmins({ title: "Synchronizacja kalendarza wymaga uwagi", body: "Kolejka zmian oczekuje ponad 2 godziny. Sprawdź połączenie Google i konflikty synchronizacji.", url: "/admin/calendar", tag: "google-queue-stale" });
    pushAccepted = result.configured && result.sent > 0;
  } catch { /* Do not expose provider errors or hide queue failure. */ }
  if (!pushAccepted) console.error("google_queue_alert_not_accepted");
  return { healthy: false, alertAttempted: true, pushAccepted };
}
