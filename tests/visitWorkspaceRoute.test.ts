import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ access: vi.fn(), visit: vi.fn(), messages: vi.fn(), documents: vi.fn(), card: vi.fn(), permission: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/adminPermissions", () => ({ hasAdminPermission: m.permission }));
vi.mock("@/lib/loyalty", () => ({ getLoyaltyCard: m.card }));
vi.mock("@/lib/privateMedia", () => ({ privateImageUrl: () => "/private/signed" }));
vi.mock("@/lib/prisma", () => ({ prisma: { appointment: { findUnique: m.visit }, projectMessage: { findMany: m.messages }, studioDocument: { findMany: m.documents } } }));
import { GET } from "../app/api/admin/appointments/[id]/workspace/route";
const call = () => GET(new Request("https://coolink.test/api/admin/appointments/v/workspace"), { params: Promise.resolve({ id: "v" }) });
beforeEach(() => {
  vi.clearAllMocks();
  m.access.mockResolvedValue({ ok: true, admin: { id: "a", role: "owner" } });
  m.permission.mockReturnValue(true);
  m.visit.mockResolvedValue({ id: "v", projectId: "p", startsAt: new Date("2026-01-01T10:00:00Z"), status: "confirmed", price: 1400, loyaltyRequested: false, loyaltyEntry: null, serviceType: "tattoo", project: { id: "p", clientId: "c", kind: "tattoo", title: "Tattoo", depositStatus: "paid", depositAmount: 200 } });
  m.messages.mockResolvedValue([]); m.documents.mockResolvedValue([{ id: "d", title: "Consent", category: "consent", version: 2, acceptances: [{ version: 1 }] }]); m.card.mockResolvedValue({ progress: 1 });
});
describe("visit workspace read boundary", () => {
  it("requires operations permission before any reads", async () => {
    m.access.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await call()).status).toBe(403); expect(m.visit).not.toHaveBeenCalled();
    expect(m.access).toHaveBeenCalledWith("operations.manage");
  });
  it("returns not found without reading unrelated clients", async () => {
    m.visit.mockResolvedValue(null); expect((await call()).status).toBe(404); expect(m.card).not.toHaveBeenCalled();
  });
  it("never exposes amounts or the loyalty ledger to non-finance roles", async () => {
    m.permission.mockReturnValue(false);
    const response = await call(); const data = await response.json();
    expect(data.card).toBeNull(); expect(data.deposit.amount).toBeNull(); expect(data.visit.price).toBeNull(); expect(data.settleable).toBe(false); expect(m.card).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("checks current document version and preserves recipient message visibility", async () => {
    const data = await (await call()).json();
    expect(data.documents).toEqual([{ id: "d", title: "Consent", category: "consent", accepted: false }]);
    expect(data.settleable).toBe(true);
    expect(m.messages).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: "p", NOT: { hiddenFor: { has: "admin:a" } } } }));
    expect(m.documents.mock.calls[0][0].select.acceptances.select).toEqual({ version: true });
  });
  it("does not offer another settlement for an already settled visit", async () => {
    const visit = await m.visit(); m.visit.mockResolvedValue({ ...visit, loyaltyEntry: { id: "paid" } });
    expect((await (await call()).json()).settleable).toBe(false);
  });
});
