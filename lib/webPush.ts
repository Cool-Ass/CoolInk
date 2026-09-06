import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function configure() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails("mailto:kontakt@coolinktattoo.pl", publicKey, privateKey);
  return { publicKey };
}

export function webPushPublicKey() { return configure()?.publicKey ?? null; }

export async function sendPushToClient(clientId: string, payload: { title: string; body: string; url: string; tag?: string }) {
  if (!configure()) return { sent: 0, configured: false };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { clientId } });
  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24, urgency: "high" });
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
    }
  }));
  return { sent, configured: true };
}

export async function sendPushToAdmins(payload: { title: string; body: string; url: string; tag?: string }) {
  if (!configure()) return { sent: 0, configured: false };
  const subscriptions = await prisma.adminPushSubscription.findMany();
  let sent = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24, urgency: "high" },
      );
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) await prisma.adminPushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
    }
  }));
  return { sent, configured: true };
}
