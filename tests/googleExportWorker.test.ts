import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), reserve: vi.fn(), retry: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/githubWorkerAuth", () => ({ googleWorkerIdentity: mocks.identity }));
vi.mock("@/lib/webhookSecurity", () => ({ reserveWebhook: mocks.reserve }));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ retryGoogleCalendarExports: mocks.retry }));
vi.mock("@/lib/prisma", () => ({ prisma: { webhookReceipt: { update: mocks.update } } }));
import { POST } from "../app/api/cron/google-exports/route";
const request = () => new Request("https://example.com", { method: "POST", headers: { authorization: "Bearer token" } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("VERCEL_ENV", "production");
  mocks.identity.mockResolvedValue("token-id");
  mocks.reserve.mockResolvedValue({ duplicate: false, receipt: { id: "receipt" } });
  mocks.retry.mockResolvedValue({ checked: 1, synced: 1 });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Google worker endpoint", () => {
  it("never consumes production work from preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.identity).not.toHaveBeenCalled();
  });
  it("rejects untrusted identities before queue access", async () => {
    mocks.identity.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it("rejects replay before export", async () => {
    mocks.reserve.mockResolvedValue({ duplicate: true });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.retry).not.toHaveBeenCalled();
  });
  it("records a successfully processed authenticated run", async () => {
    expect(await (await POST(request())).json()).toEqual({ ok: true, checked: 1, synced: 1 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "receipt" }, data: expect.objectContaining({ status: "processed" }) }));
  });
  it("reports failure without secret exception details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.retry.mockRejectedValue(new Error("private token details"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify([await response.json(), mocks.update.mock.calls, log.mock.calls])).not.toContain("private token");
  });
});
