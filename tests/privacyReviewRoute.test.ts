import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), origin: vi.fn(), rate: vi.fn(), transaction: vi.fn(), find: vi.fn(), update: vi.fn(), audit: vi.fn(), notify: vi.fn() }));
vi.mock("../lib/adminApi", () => ({ requireAdminApi: mocks.access }));
vi.mock("../lib/requestSecurity", () => ({ isSameOrigin: mocks.origin, rateLimit: mocks.rate, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("../lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { PATCH } from "../app/api/admin/privacy-requests/[id]/route";
import { privacyRevision } from "../lib/privacyRevision";
const row = { id: "request", clientId: "actual-owner", status: "pending", note: null, resolvedAt: null };
const data = { decision: "approve", identityConfirmed: true, reason: "Sprawdzono zakres i tożsamość.", response: "Oceniono wniosek. Wykonanie zostanie potwierdzone osobno.", retainedScopes: [], retainUntil: null, expectedRevision: privacyRevision(row) };
function call(body: unknown = data) { return PATCH(new Request("https://www.coolinktattoo.pl/api/admin/privacy-requests/request", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "request" }) }); }
beforeEach(() => {
  vi.resetAllMocks(); mocks.origin.mockReturnValue(true); mocks.access.mockResolvedValue({ ok: true, admin: { id: "owner-admin" } }); mocks.rate.mockResolvedValue({ allowed: true });
  mocks.find.mockResolvedValue(row); mocks.update.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation((work: (tx: unknown) => Promise<void>) => work({ accountDeletionRequest: { findUnique: mocks.find, updateMany: mocks.update }, adminAuditLog: { create: mocks.audit }, clientNotification: { create: mocks.notify } }));
});
describe("privacy review mutation boundary", () => {
  it("checks origin before identity and requires the owner permission", async () => {
    mocks.origin.mockReturnValue(false); expect((await call()).status).toBe(403); expect(mocks.access).not.toHaveBeenCalled();
    mocks.origin.mockReturnValue(true); mocks.access.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await call()).status).toBe(403); expect(mocks.access).toHaveBeenCalledWith("clients.delete"); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects rate limited, oversized, invalid and stale requests without writing", async () => {
    mocks.rate.mockResolvedValueOnce({ allowed: false }); expect((await call()).status).toBe(429);
    expect((await call({ reason: "x".repeat(9000) })).status).toBe(413);
    expect((await call({ ...data, identityConfirmed: false })).status).toBe(400);
    expect((await call({ ...data, expectedRevision: "0".repeat(64) })).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("atomically saves an assessment and only notifies the stored client, never deletes", async () => {
    const response = await call({ ...data, clientId: "forged-owner", reviewerId: "forged-admin" });
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(await response.json()).toEqual({ ok: true, deleted: false });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    const write = mocks.update.mock.calls[0][0]; expect(write.where).toEqual({ id: row.id, status: "pending", note: null, resolvedAt: null }); expect(write.data.status).toBe("awaiting_execution");
    expect(JSON.parse(write.data.note).reviewerId).toBe("owner-admin"); expect(write.data.resolvedAt).toBeUndefined();
    expect(mocks.notify.mock.calls[0][0].data.clientId).toBe("actual-owner"); expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("does not report success after a CAS, audit or notification failure", async () => {
    mocks.update.mockResolvedValueOnce({ count: 0 }); expect((await call()).status).toBe(409); expect(mocks.audit).not.toHaveBeenCalled();
    mocks.audit.mockRejectedValueOnce(new Error("unavailable")); expect((await call()).status).toBe(409); expect(mocks.notify).not.toHaveBeenCalled();
    mocks.notify.mockRejectedValueOnce(new Error("unavailable")); expect((await call()).status).toBe(409);
  });
});
