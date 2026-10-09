import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ token: vi.fn(), audit: vi.fn(), queue: vi.fn(), issues: vi.fn(), count: vi.fn() }));
const connection = { id: "connection", active: true, encryptedRefreshToken: "fixture", selections: [{calendarId: "primary", role: "primary", enabled: true}] };
vi.mock("@/lib/googleCalendarCrypto", () => ({ decryptGoogleRefreshToken: () => "fixture" }));
vi.mock("@/lib/googleCalendar", async original => ({...await original<typeof import("../lib/googleCalendar")>(),refreshGoogleCalendarAccessToken:m.token,googleCalendarRequest:vi.fn(async () => ({items:[]}))}));
vi.mock("@/lib/prisma", () => ({prisma: {
  adminAuditLog: {create:m.audit}, $queryRaw:m.queue,
  googleCalendarConnection: {findUnique:vi.fn(async () => connection), update:vi.fn(), count:m.count},
  appointment: {findMany:vi.fn(async () => [])},
  googleCalendarEventSync: {count:m.issues,findMany:vi.fn(async () => []),updateMany:vi.fn()},
}}));
import { syncGoogleCalendarForAdmin, recordGoogleSyncOutcome } from "../lib/googleCalendarSyncEngine";
beforeEach(() => {vi.resetAllMocks(); m.token.mockResolvedValue({access_token:"fixture"}); m.queue.mockResolvedValue([{pending:0}]); m.issues.mockResolvedValue(0); m.count.mockResolvedValue(1);});
describe("manual Google receipt", () => {
  it("full successful sync persists Google success only", async () => {
    expect((await syncGoogleCalendarForAdmin("owner")).healthErrorCode).toBeNull();
    expect(m.audit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({data:expect.objectContaining({action:"operational.google_calendar_sync.success"})}));
  });
  it("remaining export failure cannot be hidden by successful busy import", async () => {
    m.queue.mockResolvedValue([{pending:1}]);
    expect((await syncGoogleCalendarForAdmin("owner")).healthErrorCode).toBe("GOOGLE_EXPORT_PENDING");
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({action:"operational.google_calendar_sync.failure",metadata:expect.stringContaining("GOOGLE_EXPORT_PENDING")})}));
  });
  it("records safe failure and rethrows provider exception to existing handler", async () => {
    m.token.mockRejectedValue(new Error("private token"));
    await expect(syncGoogleCalendarForAdmin("owner")).rejects.toThrow("private token");
    expect(JSON.stringify(m.audit.mock.calls)).not.toContain("private token");
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({action:"operational.google_calendar_sync.failure"})}));
  });
  it("limited batches and one-account sync cannot clear other connections' errors", async () => {
    m.count.mockResolvedValue(6);
    expect(await recordGoogleSyncOutcome("cron")).toBe("GOOGLE_SYNC_INCOMPLETE");
    expect(await recordGoogleSyncOutcome("manual")).toBe("GOOGLE_SYNC_INCOMPLETE");
    expect(m.audit).not.toHaveBeenCalled();
  });
});
