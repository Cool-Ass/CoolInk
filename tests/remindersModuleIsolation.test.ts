import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ retry:vi.fn(), busy:vi.fn(), outcome:vi.fn(), health:vi.fn(), audit:vi.fn(), appointments:vi.fn() }));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ retryGoogleCalendarExports:m.retry, refreshGoogleBusyCalendars:m.busy, recordGoogleSyncOutcome:m.outcome }));
vi.mock("@/lib/operationalHealth", () => ({ recordOperationalHealth:m.health }));
vi.mock("@/lib/webPush", () => ({sendPushToAdmins:vi.fn(async () => ({configured:false,sent:0})),sendPushToClient:vi.fn()}));
vi.mock("@/lib/waitlistAutomation", () => ({offerReleasedRange:vi.fn()}));
vi.mock("@/lib/dataRetention", () => ({applyOperationalDataRetention:vi.fn(async () => ({}))}));
vi.mock("@/lib/prisma", () => ({prisma:{waitlistEntry:{findMany:vi.fn(async () => [])},appointment:{findMany:m.appointments},adminAuditLog:{create:m.audit}}}));
import { GET } from "../app/api/cron/reminders/route";
const request = () => new Request("https://example.test/api/cron/reminders", {headers:{authorization:"Bearer fixture"}});
beforeEach(() => {vi.resetAllMocks();vi.stubEnv("CRON_SECRET","fixture");m.busy.mockResolvedValue({refreshed:1,failed:0});m.appointments.mockResolvedValue([]);m.health.mockResolvedValue(true);m.outcome.mockResolvedValue(null);});
afterEach(() => {vi.unstubAllEnvs();vi.restoreAllMocks();});
describe("reminder/Google isolation", () => {
  it("Google exception does not block reminders or mark them failed", async () => {
    m.retry.mockRejectedValue(new Error("private token"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({error:"GOOGLE_SYNC_FAILED",reminders:"success"});
    expect(m.appointments).toHaveBeenCalled();
    expect(m.health.mock.calls).toEqual([["google_calendar_sync","GOOGLE_SYNC_FAILED","cron"],["reminders_worker",null,"cron"]]);
  });
  it("reminder exception does not overwrite Google success", async () => {
    vi.spyOn(console,"error").mockImplementation(() => {});
    m.appointments.mockRejectedValue(new Error("private database"));
    expect((await GET(request())).status).toBe(503);
    expect(m.outcome).toHaveBeenCalledWith("cron",0);
    expect(m.health).toHaveBeenCalledWith("reminders_worker","REMINDERS_WORKER_FAILED","cron");
    expect(m.health.mock.calls.some(([module]) => module === "google_calendar_sync")).toBe(false);
  });
  it("rejects unauthenticated requests without writing health", async () => {
    expect((await GET(new Request("https://example.test"))).status).toBe(401);
    expect(m.health).not.toHaveBeenCalled(); expect(m.retry).not.toHaveBeenCalled();
  });
});
