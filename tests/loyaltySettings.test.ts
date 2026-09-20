import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LOYALTY_RULES } from "../lib/loyaltyRules";
const mock = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), limit: vi.fn(), upsert: vi.fn(), audit: vi.fn(), lock: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: mock.auth }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: mock.origin, rateLimit: mock.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: mock.lock }));
vi.mock("@/lib/loyaltySettings", () => ({ LOYALTY_SETTINGS_KEY: "loyalty_rules", getLoyaltyRules: async () => DEFAULT_LOYALTY_RULES }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: unknown) => unknown) => run({ siteSetting: { upsert: mock.upsert }, adminAuditLog: { create: mock.audit } }) } }));
import { PUT } from "../app/api/admin/settings/loyalty/route";
const call = (body: unknown = DEFAULT_LOYALTY_RULES) => PUT(new Request("http://localhost/api/admin/settings/loyalty", { method: "PUT", body: JSON.stringify(body) }));
beforeEach(() => { vi.clearAllMocks(); mock.auth.mockResolvedValue({ ok: true, admin: { id: "owner" } }); mock.origin.mockReturnValue(true); mock.limit.mockResolvedValue({ allowed: true }); });
describe("loyalty settings", () => {
  it("requires same origin", async () => { mock.origin.mockReturnValue(false); expect((await call()).status).toBe(403); expect(mock.upsert).not.toHaveBeenCalled(); });
  it("requires settings permission", async () => { mock.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) }); expect((await call()).status).toBe(403); expect(mock.auth).toHaveBeenCalledWith("settings.manage"); });
  it("rate limits writes", async () => { mock.limit.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429); });
  it("rejects incomplete or invalid values", async () => { expect((await call({ stampsRequired: 0 })).status).toBe(400); expect(mock.upsert).not.toHaveBeenCalled(); });
  it("serializes updates with settlements and audits before and after", async () => { expect((await call()).status).toBe(200); expect(mock.lock).toHaveBeenCalledOnce(); expect(mock.upsert).toHaveBeenCalledOnce(); expect(mock.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: JSON.stringify({ before: DEFAULT_LOYALTY_RULES, after: DEFAULT_LOYALTY_RULES }) }) })); });
});
