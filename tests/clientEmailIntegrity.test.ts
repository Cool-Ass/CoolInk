import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: async () => ({ ok: true, admin: { id: "admin" } }) }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: () => true }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: unknown) => unknown) => run({ client: { findUnique: m.find, updateMany: m.update, findUniqueOrThrow: async () => ({ id: "client" }) }, adminAuditLog: { create: m.audit } }) } }));
import { PATCH } from "../app/api/admin/clients/[id]/route";
const save = (email: string) => PATCH(new Request("https://coolink.test/api/admin/clients/client", { method: "PATCH", body: JSON.stringify({ firstName: "Test", lastName: "Client", email }) }), { params: Promise.resolve({ id: "client" }) });
beforeEach(() => { vi.clearAllMocks(); m.find.mockResolvedValue({ email: "old@example.com", supabaseUserId: "auth-user" }); m.update.mockResolvedValue({ count: 1 }); });
it("rejects changing a linked login email without any write", async () => {
  expect((await save("new@example.com")).status).toBe(409);
  expect(m.update).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
});
it("allows other profile edits without writing the linked email", async () => {
  expect((await save("OLD@example.com")).status).toBe(200);
  expect(m.update.mock.calls[0][0].data).not.toHaveProperty("email");
  expect(m.audit).toHaveBeenCalledOnce();
});
it("allows unlinked CRM email edits with an atomic identity guard", async () => {
  m.find.mockResolvedValue({ email: "old@example.com", supabaseUserId: null });
  expect((await save("new@example.com")).status).toBe(200);
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "client", email: "old@example.com", supabaseUserId: null }, data: expect.objectContaining({ email: "new@example.com" }) }));
});
it("rejects a concurrently linked account and does not record success", async () => {
  m.find.mockResolvedValue({ email: "old@example.com", supabaseUserId: null }); m.update.mockResolvedValue({ count: 0 });
  expect((await save("new@example.com")).status).toBe(409); expect(m.audit).not.toHaveBeenCalled();
});
it("rejects a missing client", async () => {
  m.find.mockResolvedValue(null); expect((await save("old@example.com")).status).toBe(409); expect(m.update).not.toHaveBeenCalled();
});
it("saves the acquisition source on the client and rejects unknown options", async () => {
  const request = (leadSource: string) => new Request("https://coolink.test/api/admin/clients/client", { method: "PATCH", body: JSON.stringify({ firstName: "Test", lastName: "Client", email: "old@example.com", leadSource }) });
  expect((await PATCH(request("instagram"), { params: Promise.resolve({ id: "client" }) })).status).toBe(200);
  expect(m.update.mock.calls[0][0].data.leadSource).toBe("instagram");
  m.update.mockClear();
  expect((await PATCH(request("forged"), { params: Promise.resolve({ id: "client" }) })).status).toBe(400);
  expect(m.update).not.toHaveBeenCalled();
});
