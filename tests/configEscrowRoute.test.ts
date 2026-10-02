import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), reserve: vi.fn(), update: vi.fn(), recipient: vi.fn(), seal: vi.fn() }));
vi.mock("@/lib/githubBackupAuth", () => ({ backupWorkflowIdentity: mocks.identity }));
vi.mock("@/lib/webhookSecurity", () => ({ reserveWebhook: mocks.reserve }));
vi.mock("@/lib/prisma", () => ({ prisma: { webhookReceipt: { update: mocks.update } } }));
vi.mock("@/lib/configEscrow", () => ({ escrowRecipient: mocks.recipient, sealRuntimeConfiguration: mocks.seal }));
import { POST } from "../app/api/cron/config-escrow/route";
function request(body = JSON.stringify({ publicKey: "spki" }), extra = {}) {
  return new Request("https://example.com", { method: "POST", body, headers: { authorization: "Bearer signed", "content-type": "application/json", ...extra } });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("BACKUP_CONFIG_ESCROW_ENABLED", "1");
  mocks.identity.mockResolvedValue("123:1"); mocks.recipient.mockReturnValue({ audience: "recipient-bound" });
  mocks.reserve.mockResolvedValue({ duplicate: false, receipt: { id: "receipt" } });
  mocks.seal.mockReturnValue({ ciphertext: "sealed-only" });
});
afterEach(() => vi.unstubAllEnvs());
describe("configuration escrow endpoint", () => {
  it("is unavailable by default and from preview deployments", async () => {
    vi.stubEnv("BACKUP_CONFIG_ESCROW_ENABLED", ""); expect((await POST(request())).status).toBe(503);
    vi.stubEnv("BACKUP_CONFIG_ESCROW_ENABLED", "1"); vi.stubEnv("VERCEL_ENV", "preview"); expect((await POST(request())).status).toBe(503);
    expect(mocks.seal).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it("rejects browser/cookie requests and unverified identity before any database access", async () => {
    for (const headers of [{ origin: "https://example.com" }, { cookie: "admin_session=not-authority" }, { authorization: "" }]) expect((await POST(request(undefined, headers))).status).toBe(401);
    mocks.identity.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.seal).not.toHaveBeenCalled();
  });
  it("rejects oversized and caller-selected export bodies", async () => {
    for (const body of ["x".repeat(2049), "{", JSON.stringify({ publicKey: "spki", keys: ["OTHER_SECRET"] }), "[]"]) expect((await POST(request(body))).status).toBe(400);
    expect(mocks.identity).not.toHaveBeenCalled(); expect(mocks.reserve).not.toHaveBeenCalled();
  });
  it("binds verification to the recipient before sealing and records only receipt metadata", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ ciphertext: "sealed-only" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.identity).toHaveBeenCalledWith(expect.any(Request), "recipient-bound");
    expect(mocks.seal).toHaveBeenCalledWith("spki", "123:1");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "processed" }) }));
  });
  it("rejects replay and never exposes exception details", async () => {
    mocks.reserve.mockResolvedValue({ duplicate: true }); expect((await POST(request())).status).toBe(409); expect(mocks.seal).not.toHaveBeenCalled();
    mocks.reserve.mockRejectedValue(new Error("private-key-detail"));
    const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-key-detail");
  });
});
