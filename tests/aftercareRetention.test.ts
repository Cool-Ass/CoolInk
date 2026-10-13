import { describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ reminders: vi.fn(async () => ({ count: 0 })), other: vi.fn(async () => ({ count: 0 })) }));
vi.mock("@/lib/prisma", () => ({ prisma: { rateLimitBucket: { deleteMany: m.other }, webhookReceipt: { deleteMany: m.other }, clientNotification: { deleteMany: m.other }, reminderDelivery: { deleteMany: m.reminders }, $transaction: (work: unknown[]) => Promise.all(work) } }));
import { applyOperationalDataRetention } from "@/lib/dataRetention";
describe("aftercare receipt retention", () => {
  it("does not erase final-stage idempotency when reminder retention is shortened", async () => {
    vi.stubEnv("RETENTION_REMINDER_DELIVERY_DAYS", "1");
    try { await applyOperationalDataRetention(); expect(m.reminders).toHaveBeenCalledWith({ where: { createdAt: { lt: expect.any(Date) }, NOT: { channel: { startsWith: "aftercare:" } } } }); }
    finally { vi.unstubAllEnvs(); }
  });
});
