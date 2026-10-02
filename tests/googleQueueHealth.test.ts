import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ status: vi.fn(), claim: vi.fn(), push: vi.fn() }));
vi.mock("../lib/googleExportOutbox", () => ({ googleExportQueueStatus: mocks.status }));
vi.mock("../lib/prisma", () => ({ prisma: { $executeRaw: mocks.claim } }));
vi.mock("../lib/webPush", () => ({ sendPushToAdmins: mocks.push }));
import { monitorGoogleQueue, staleGoogleQueue, GOOGLE_QUEUE_MAX_AGE_MS } from "../lib/googleQueueHealth";
const now = Date.UTC(2026, 9, 2, 12);
beforeEach(() => { vi.resetAllMocks(); mocks.status.mockResolvedValue({ pending: 1, oldestQueuedAt: new Date(now - GOOGLE_QUEUE_MAX_AGE_MS) }); mocks.claim.mockResolvedValue(1); mocks.push.mockResolvedValue({ configured: true, sent: 1 }); });
describe("stale export queue monitor", () => {
  it("handles empty, young, exactly expired and missing queue timestamps", () => {
    expect(staleGoogleQueue(0, null, now)).toBe(false);
    expect(staleGoogleQueue(1, new Date(now - GOOGLE_QUEUE_MAX_AGE_MS + 1), now)).toBe(false);
    expect(staleGoogleQueue(1, new Date(now - GOOGLE_QUEUE_MAX_AGE_MS), now)).toBe(true);
    expect(staleGoogleQueue(1, null, now)).toBe(true);
  });
  it("does not send or claim alerts for healthy queues", async () => {
    mocks.status.mockResolvedValue({ pending: 0, oldestQueuedAt: null });
    expect(await monitorGoogleQueue(now)).toMatchObject({ healthy: true });
    expect(mocks.claim).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
  });
  it("deduplicates alerts without turning the unhealthy result green", async () => {
    mocks.claim.mockResolvedValue(0);
    expect(await monitorGoogleQueue(now)).toEqual({ healthy: false, alertAttempted: false, pushAccepted: false });
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it("records provider acceptance, not user acknowledgement", async () => {
    expect(await monitorGoogleQueue(now)).toEqual({ healthy: false, alertAttempted: true, pushAccepted: true });
  });
  it("keeps missing push configuration visible without logging private failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.push.mockRejectedValue(new Error("private-provider-credential"));
    expect(await monitorGoogleQueue(now)).toMatchObject({ healthy: false, pushAccepted: false });
    expect(log).toHaveBeenCalledWith("google_queue_alert_not_accepted");
    log.mockRestore();
  });
});
