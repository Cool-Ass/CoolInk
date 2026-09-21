import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), limit: vi.fn(), upsert: vi.fn(), remove: vi.fn(), audit: vi.fn(), encrypt: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: mock.auth }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: mock.origin, rateLimit: mock.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/googleCalendarCrypto", () => ({ encryptGoogleRefreshToken: mock.encrypt }));
vi.mock("@/lib/googleReviewsSettings", () => ({ GOOGLE_REVIEWS_KEY: "private_google_reviews_api_key" }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: unknown) => unknown) => run({ siteSetting: { upsert: mock.upsert, deleteMany: mock.remove }, adminAuditLog: { create: mock.audit } }) } }));
import { PUT } from "../app/api/admin/settings/google-reviews/route";
const call = (extra = {}) => PUT(new Request("http://localhost/api/admin/settings/google-reviews", { method: "PUT", body: JSON.stringify({ placeId: "ChIJ_test", mapsUrl: "https://maps.google.com", apiKey: "", ...extra }) }));
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, admin: { id: "owner" } }); mock.origin.mockReturnValue(true); mock.limit.mockResolvedValue({ allowed: true }); mock.encrypt.mockReturnValue("encrypted"); });
describe("Google reviews settings", () => {
  it("requires same origin and settings permission", async () => {
    mock.origin.mockReturnValue(false); expect((await call()).status).toBe(403);
    mock.origin.mockReturnValue(true); mock.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await call()).status).toBe(403); expect(mock.auth).toHaveBeenCalledWith("settings.manage"); expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("rate limits writes", async () => { mock.limit.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429); });
  it("rejects unsafe links", async () => { expect((await call({ mapsUrl: "javascript:alert(1)" })).status).toBe(400); expect(mock.upsert).not.toHaveBeenCalled(); });
  it("stores only encrypted key and never returns or audits it", async () => {
    const response = await call({ apiKey: "secret-test" });
    expect(response.status).toBe(200);
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { key: "private_google_reviews_api_key", value: "encrypted" } }));
    expect(JSON.stringify(mock.audit.mock.calls)).not.toContain("secret-test");
    expect(await response.text()).not.toContain("secret-test");
  });
  it("preserves a key when password input is empty", async () => { expect((await call()).status).toBe(200); expect(mock.upsert).toHaveBeenCalledTimes(2); expect(mock.remove).not.toHaveBeenCalled(); });
  it("fails closed when encryption is unavailable", async () => { mock.encrypt.mockImplementation(() => { throw new Error(); }); expect((await call({ apiKey: "secret-test" })).status).toBe(503); expect(mock.upsert).not.toHaveBeenCalled(); });
});
