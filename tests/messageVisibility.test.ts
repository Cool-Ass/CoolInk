import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ project: vi.fn(), direct: vi.fn(), client: vi.fn(), admin: vi.fn(), origin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { projectMessage: { updateMany: m.project }, directMessage: { updateMany: m.direct } } }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/auth", () => ({ getCurrentAdmin: m.admin }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin }));
import { hideDirectMessages, messageRecipient, visibleMessages } from "../lib/messageVisibility";
import { DELETE as clientHide } from "../app/api/client/inbox/route";
import { DELETE as adminHide } from "../app/api/admin/inbox/route";
const request = (id = "all") => new Request("https://coolink.test/api/inbox", { method: "DELETE", body: JSON.stringify({ kind: "messages", id }) });
beforeEach(() => { vi.clearAllMocks(); m.origin.mockReturnValue(true); m.client.mockResolvedValue({ id: "client-a" }); m.admin.mockResolvedValue({ id: "admin-a" }); m.project.mockResolvedValue({ count: 1 }); m.direct.mockResolvedValue({ count: 1 }); });
describe("recipient-only message hiding", () => {
  it("does not let different recipients share visibility keys", () => {
    expect(messageRecipient("client", "a")).not.toBe(messageRecipient("admin", "a"));
    expect(visibleMessages("admin:a")).toEqual({ NOT: { hiddenFor: { has: "admin:a" } } });
    expect(() => messageRecipient("admin", "")).toThrow();
  });
  it("atomically appends only the caller and excludes already hidden records", async () => {
    await hideDirectMessages({ clientId: "client-a" }, "admin:a");
    expect(m.direct).toHaveBeenCalledWith({ where: { AND: [{ clientId: "client-a" }, visibleMessages("admin:a")] }, data: { hiddenFor: { push: "admin:a" } } });
  });
  it("scopes client bulk hiding to owned messages and never calls storage/deletion", async () => {
    expect((await clientHide(request()))?.status).toBe(200);
    expect(m.project).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ author: "admin", project: { clientId: "client-a" } }, visibleMessages("client:client-a")] }, data: { hiddenFor: { push: "client:client-a" } } }));
    expect(m.direct).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ clientId: "client-a", author: "admin" }, visibleMessages("client:client-a")] } }));
  });
  it("hides a direct message for one admin without touching project messages", async () => {
    expect((await adminHide(request("direct:message")))?.status).toBe(200);
    expect(m.project).not.toHaveBeenCalled();
    expect(m.direct).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ id: "message", author: "client" }, visibleMessages("admin:admin-a")] } }));
  });
  it("treats a repeated hide as success", async () => {
    m.direct.mockResolvedValue({ count: 0 });
    expect((await clientHide(request("direct:message")))?.status).toBe(200);
  });
  it("rejects missing identity and foreign origins", async () => {
    m.client.mockResolvedValue(null);
    expect((await clientHide(request()))?.status).toBe(401);
    m.origin.mockReturnValue(false);
    expect((await adminHide(request()))?.status).toBe(403);
    expect(m.direct).not.toHaveBeenCalled();
  });
});
