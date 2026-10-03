import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ origin: vi.fn(), access: vi.fn(), rate: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.rate, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/privacyExecution", () => ({ executePrivacyRequest: m.execute }));
import { POST } from "../app/api/admin/privacy-requests/[id]/execute/route";
const data = { confirmation: "USUŃ request", expectedRevision: "a".repeat(64), backupRunId: "123" };
const call = (body: unknown = data) => POST(new Request("https://example.test/api/admin/privacy-requests/request/execute", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "request" }) });
beforeEach(() => { vi.resetAllMocks(); m.origin.mockReturnValue(true); m.access.mockResolvedValue({ ok: true, admin: { id: "owner", role: "owner" } }); m.rate.mockResolvedValue({ allowed: true }); m.execute.mockResolvedValue({ completed: true }); });
describe("separate privacy execution confirmation", () => {
  it("checks origin, owner and rate before mutation", async () => {
    m.origin.mockReturnValue(false); expect((await call()).status).toBe(403); expect(m.access).not.toHaveBeenCalled();
    m.origin.mockReturnValue(true); m.access.mockResolvedValue({ ok: true, admin: { id: "manager", role: "manager" } }); expect((await call()).status).toBe(403);
    m.access.mockResolvedValue({ ok: true, admin: { id: "owner", role: "owner" } }); m.rate.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429); expect(m.execute).not.toHaveBeenCalled();
  });
  it("requires exact request confirmation and bounded fresh revision/backup identifiers", async () => {
    expect((await call({ ...data, confirmation: "USUŃ another" })).status).toBe(400);
    expect((await call({ ...data, backupRunId: "https://evil.test" })).status).toBe(400);
    expect((await call({ confirmation: "x".repeat(3000) })).status).toBe(413);
    expect(m.execute).not.toHaveBeenCalled();
    expect((await call({ ...data, clientId: "foreign" })).status).toBe(200);
    expect(m.execute).toHaveBeenCalledWith("request", "owner", data.expectedRevision, "123");
  });
  it("fails without exposing provider errors or claiming completion", async () => {
    m.execute.mockRejectedValue(new Error("secret provider token")); const response = await call(); expect(response.status).toBe(409); expect(JSON.stringify(await response.json())).not.toContain("secret provider");
  });
});
