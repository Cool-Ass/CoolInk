import { prisma } from "@/lib/prisma";

function retentionDate(days: number, fallback: number) {
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(Math.floor(days), 1), 3_650) : fallback;
  return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1_000);
}

/** Removes short-lived operational metadata only. Legal and client records stay intact. */
export async function applyOperationalDataRetention() {
  const webhookBefore = retentionDate(Number(process.env.RETENTION_WEBHOOK_DAYS), 90);
  const notificationBefore = retentionDate(Number(process.env.RETENTION_READ_NOTIFICATION_DAYS), 365);
  const reminderBefore = retentionDate(Number(process.env.RETENTION_REMINDER_DELIVERY_DAYS), 730);
  const rateLimitBefore = new Date(Date.now() - 2 * 24 * 60 * 60 * 1_000);

  const [rateLimits, webhooks, notifications, reminders] = await prisma.$transaction([
    prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: rateLimitBefore } } }),
    prisma.webhookReceipt.deleteMany({ where: { receivedAt: { lt: webhookBefore } } }),
    prisma.clientNotification.deleteMany({ where: { readAt: { not: null, lt: notificationBefore } } }),
    prisma.reminderDelivery.deleteMany({ where: { createdAt: { lt: reminderBefore } } }),
  ]);

  return {
    rateLimits: rateLimits.count,
    webhooks: webhooks.count,
    notifications: notifications.count,
    reminders: reminders.count,
  };
}
