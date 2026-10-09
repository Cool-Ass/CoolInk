import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ identity: vi.fn(), reserve: vi.fn(), transaction: vi.fn(), setting: vi.fn(), audit: vi.fn(), receipt: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/githubWorkerAuth", () => ({ recoveryWorkerIdentity: m.identity }));
vi.mock("@/lib/webhookSecurity", () => ({ reserveWebhook: m.reserve }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: m.push }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: m.transaction, webhookReceipt: { update: m.receipt } } }));
import { POST } from "../app/api/cron/recovery-health/route";
const body = { healthy: false, reasons: ["BACKUP_MISSING_OR_STALE"] };
const call = (value: unknown = body, headers = {}) => POST(new Request("https://example.test/api/cron/recovery-health", { method: "POST", body: JSON.stringify(value), headers: { authorization: "Bearer fixture", ...headers } }));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("VERCEL_ENV", "production");
  m.identity.mockResolvedValue("123:1"); m.reserve.mockResolvedValue({ duplicate: false, receipt: { id: "receipt" } }); m.push.mockResolvedValue({ configured: false, sent: 0 });
  m.receipt.mockResolvedValue({});
  m.transaction.mockImplementation((work: (tx: unknown) => unknown) => work({ siteSetting: { upsert: m.setting }, adminAuditLog: { create: m.audit }, webhookReceipt: { update: m.receipt } }));
});
afterEach(() => vi.unstubAllEnvs());
describe("durable recovery report", () => {
  it("fresh healthy report records recovery only and never heals Google/reminders", async () => {
    expect((await call({healthy:true,reasons:[]})).status).toBe(200);
    expect(m.audit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({data:expect.objectContaining({action:"operational.recovery_monitor.success"})}));
    expect(m.setting.mock.calls[0][0].where.key).toBe("internal.recoveryMonitor");
    expect(m.push).not.toHaveBeenCalled();
  });
  it("rejects preview, browser authority and invalid identity before any write", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); expect((await call()).status).toBe(503);
    vi.stubEnv("VERCEL_ENV", "production"); expect((await call(body, { cookie: "owner" })).status).toBe(401); expect((await call(body, { origin: "https://example.test" })).status).toBe(401);
    m.identity.mockResolvedValue(null); expect((await call()).status).toBe(401); expect(m.reserve).not.toHaveBeenCalled();
  });
  it("bounds reports, rejects unknown reasons and protects replay", async () => {
    expect((await call({ data: "x".repeat(3000) })).status).toBe(413);
    expect((await call({ healthy: false, reasons: ["private exception"] })).status).toBe(400);
    m.reserve.mockResolvedValue({ duplicate: true }); expect((await call()).status).toBe(409); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("persists an owner-visible alert even without push and never sends arbitrary input", async () => {
    const response = await call(); expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, persisted: true, healthy: false, pushDelivered: false });
    expect(m.setting).toHaveBeenCalledOnce(); expect(m.audit).toHaveBeenCalledTimes(2); expect(m.receipt).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "processed" }) }));
    const saved = JSON.parse(m.setting.mock.calls[0][0].update.value); expect(saved.reasons).toEqual(body.reasons); expect(saved.eventId).toBe("123:1");
  });
  it("does not report delivery after a transaction failure", async () => {
    m.transaction.mockRejectedValue(new Error("private database credentials")); const response = await call();
    expect(response.status).toBe(503); expect(m.push).not.toHaveBeenCalled(); expect(JSON.stringify(await response.json())).not.toContain("private database");
  });
});
