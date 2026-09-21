import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), limit: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.auth }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { siteSetting: { upsert: m.upsert } } }));
import { PUT } from "../app/api/admin/section-layout/route";
const layout = { order: ["today"], collapsed: [], hidden: [] };
const call = (body: unknown = { scope: "dashboard", layout }) => PUT(new Request("http://localhost/api/admin/section-layout", { method: "PUT", body: JSON.stringify(body) }));
beforeEach(() => { vi.clearAllMocks(); m.auth.mockResolvedValue({ ok: true, admin: { id: "own" } }); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: true }); });
describe("section settings isolation", () => {
  it("saves only the authenticated administrator's layout", async () => {
    expect((await call({ scope: "dashboard", layout, adminId: "foreign" })).status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith({ where: { key: "admin_layout:own:dashboard" }, create: { key: "admin_layout:own:dashboard", value: JSON.stringify(layout) }, update: { value: JSON.stringify(layout) } });
  });
  it("rejects unauthenticated requests", async () => {
    m.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await call()).status).toBe(401); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("rejects foreign origins, rate limits and malformed settings", async () => {
    m.origin.mockReturnValue(false); expect((await call()).status).toBe(403);
    m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429);
    m.limit.mockResolvedValue({ allowed: true });
    expect((await call({ scope: "foreign", layout })).status).toBe(400);
    expect((await call({ scope: "dashboard", layout: {} })).status).toBe(400);
    expect(m.upsert).not.toHaveBeenCalled();
  });
});
