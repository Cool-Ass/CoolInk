import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REPLAY_WINDOW_SECONDS = 5 * 60;

export function signWebhookBody(secret: string, timestamp: number, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyWebhookSignature(body: string, header: string | null, secret: string, now = Date.now()) {
  const parts = Object.fromEntries((header || "").split(",").map((part) => part.trim().split("=", 2)));
  const timestamp = Number(parts.t);
  const signature = parts.v1 || "";
  if (!Number.isInteger(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > REPLAY_WINDOW_SECONDS || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signWebhookBody(secret, timestamp, body), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function reserveWebhook(provider: string, eventId: string, signature: string) {
  try {
    const receipt = await prisma.webhookReceipt.create({ data: { provider: provider.slice(0, 80), eventId: eventId.slice(0, 200), signatureDigest: createHash("sha256").update(signature).digest("hex") } });
    return { duplicate: false as const, receipt };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { duplicate: true as const, receipt: null };
    throw error;
  }
}
