import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ audit: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { adminAuditLog: { create: m.audit, findFirst: m.read } } }));
import { healthEvent, moduleHealth, readOperationalHealth, recordOperationalHealth } from "../lib/operationalHealth";
import { readRecoveryMonitor } from "../lib/recoveryMonitor";
beforeEach(() => vi.resetAllMocks());
describe("independent health receipts", () => {
  it("Google success writes only Google; no recovery or reminder receipt", async () => {
    await recordOperationalHealth("google_calendar_sync", null, "manual");
    expect(m.audit).toHaveBeenCalledExactlyOnceWith({ data: healthEvent("google_calendar_sync", null, "manual") });
  });
  it("reads separate success/failure timestamps without the 24h expiry masking unresolved errors", async () => {
    const failedAt = new Date("2026-10-08T08:18:00Z"), succeededAt = new Date("2026-10-09T01:58:16Z");
    m.read.mockImplementation(({where}) => Promise.resolve(where.action.endsWith("success") ? { createdAt: succeededAt, metadata: null } : { createdAt: failedAt, metadata: JSON.stringify({errorCode: "GOOGLE_SYNC_FAILED"}) }));
    expect(await readOperationalHealth("google_calendar_sync")).toMatchObject({ status: "healthy", lastSuccessAt: succeededAt, lastFailureAt: failedAt, errorCode: null });
    expect(m.read.mock.calls.every(([query]) => query.where.action.startsWith("operational.google_calendar_sync."))).toBe(true);
  });
  it("later failures and simultaneous failure/success stay visible; unknown is not green", () => {
    const createdAt = new Date();
    expect(moduleHealth(null, null).status).toBe("unknown");
    expect(moduleHealth({createdAt}, {createdAt, metadata: JSON.stringify({errorCode: "REMINDERS_WORKER_FAILED"})})).toMatchObject({status: "failed", errorCode: "REMINDERS_WORKER_FAILED"});
    expect(moduleHealth(null, {createdAt, metadata: '{"errorCode":"private token"}'}).errorCode).toBeNull();
  });
  it("Google success cannot make an expired recovery report fresh", async () => {
    const now = Date.parse("2026-10-09T02:30:00Z");
    const value = JSON.stringify({healthy:true,reasons:[],checkedAt:"2026-10-08T22:02:00Z",eventId:"123:1"});
    await recordOperationalHealth("google_calendar_sync", null, "manual");
    expect(readRecoveryMonitor(value, now)).toBeNull();
    expect(readRecoveryMonitor(JSON.stringify({healthy:true,reasons:[],checkedAt:new Date(now).toISOString(),eventId:"124:1"}), now)?.healthy).toBe(true);
  });
});
