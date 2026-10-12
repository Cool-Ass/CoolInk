import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DEPOSIT_INSTRUCTIONS } from "../lib/depositInstructions";
const m = vi.hoisted(() => ({ access: vi.fn(), origin: vi.fn(), limit: vi.fn(), transaction: vi.fn(), read: vi.fn(), upsert: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: m.transaction } }));
import { PUT } from "../app/api/admin/settings/deposits/route";
const call = (body: unknown = DEFAULT_DEPOSIT_INSTRUCTIONS) => PUT(new Request("https://coolink.test/api/admin/settings/deposits", { method: "PUT", body: JSON.stringify(body) }));
beforeEach(() => {
  vi.clearAllMocks(); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: true }); m.access.mockResolvedValue({ ok: true, admin: { id: "owner", role: "owner" } }); m.read.mockResolvedValue(null);
  m.transaction.mockImplementation(async fn => fn({ siteSetting: { findUnique: m.read, upsert: m.upsert }, adminAuditLog: { create: m.audit } }));
});
describe("deposit instruction settings", () => {
  it("requires owner settings permission and same origin", async () => {
    m.origin.mockReturnValue(false); expect((await call()).status).toBe(403); expect(m.access).not.toHaveBeenCalled();
    m.origin.mockReturnValue(true); m.access.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await call()).status).toBe(403); expect(m.access).toHaveBeenCalledWith("settings.manage"); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("rejects invalid recipients and rate limits before writing", async () => {
    expect((await call({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, phone: "invalid" })).status).toBe(400);
    m.limit.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429); expect(m.upsert).not.toHaveBeenCalled();
  });
  it("saves normalized instructions and audit atomically without modifying visits", async () => {
    expect((await call({ ...DEFAULT_DEPOSIT_INSTRUCTIONS, phone: "530 178 346", cashEnabled: false })).status).toBe(200);
    expect(m.upsert.mock.calls[0][0].where).toEqual({ key: "deposit_instructions" });
    const saved = JSON.parse(m.upsert.mock.calls[0][0].update.value); expect(saved.phone).toBe("530178346"); expect(saved.cashEnabled).toBe(false);
    expect(m.audit.mock.calls[0][0].data.action).toBe("deposit_instructions.update");
  });
});
