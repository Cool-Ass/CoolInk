import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  client: vi.fn(), admin: vi.fn(), direct: vi.fn(), project: vi.fn(), owned: vi.fn(), create: vi.fn(),
}));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/auth", () => ({ getCurrentAdmin: m.admin }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  directMessage: { findMany: m.direct },
  projectMessage: { findMany: m.project },
  tattooProject: { findFirst: m.owned, findUnique: m.owned },
  client: { findUnique: m.owned },
} }));
vi.mock("@/lib/requestSecurity", () => ({
  isSameOrigin: () => true, rateLimit: async () => ({ allowed: true }), tooManyRequests: vi.fn(),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: async () => undefined, sendPushToClient: async () => undefined }));
vi.mock("@/lib/chatImage", () => ({
  readChatInput: async () => ({ body: "Pierwsza wiadomość", imageUrl: null }),
  serializeDirectMessage: (message: unknown) => message,
}));
vi.mock("@/lib/clientMediaWrite", () => ({
  withClientMediaWrite: (_id: string, fn: (tx: unknown, track: unknown) => unknown) => fn({ directMessage: { create: m.create } }, vi.fn()),
}));
import { GET as clientDirect, POST as initiate } from "../app/api/client/messages/route";
import { GET as adminDirect } from "../app/api/admin/clients/[id]/messages/route";
import { GET as clientProject } from "../app/api/client/projects/[id]/messages/route";
import { GET as adminProject } from "../app/api/admin/projects/[id]/messages/route";

beforeEach(() => {
  vi.clearAllMocks();
  m.client.mockResolvedValue({ id: "client-self", firstName: "Test", lastName: "User" });
  m.admin.mockResolvedValue({ id: "admin-self" }); m.owned.mockResolvedValue({ id: "conversation" });
  const rows = Array.from({ length: 51 }, (_, i) => ({
    id: String(205 - i), createdAt: new Date("2026-01-01"), body: "test", author: "client", readAt: null, attachment: null,
  }));
  m.direct.mockResolvedValue(rows); m.project.mockResolvedValue(rows);
  m.create.mockResolvedValue({ id: "first", body: "Pierwsza wiadomość" });
});
describe("conversation endpoint pagination and authorization", () => {
  const context = { params: Promise.resolve({ id: "conversation" }) };
  it.each([
    ["client direct", clientDirect, m.direct, "client:client-self"],
    ["admin direct", adminDirect, m.direct, "admin:admin-self"],
    ["client project", clientProject, m.project, "client:client-self"],
    ["admin project", adminProject, m.project, "admin:admin-self"],
  ] as const)("%s scopes and orders each page without exposing hidden messages", async (_label, get, query, recipient) => {
    const response = await get(new Request("https://coolink.test/messages"), context);
    const body = await response.json();
    expect(body.messages).toHaveLength(50);
    expect(body.messages.at(-1).id).toBe("205");
    expect(body.hasMore).toBe(true);
    expect(query.mock.calls[0][0]).toMatchObject({
      take: 51, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      where: { NOT: { hiddenFor: { has: recipient } } },
    });
  });
  it("does not read another client's project conversation", async () => {
    m.owned.mockResolvedValue(null);
    expect((await clientProject(new Request("https://coolink.test/messages"), context)).status).toBe(404);
    expect(m.owned).toHaveBeenCalledWith({ where: { id: "conversation", clientId: "client-self" }, select: { id: true } });
    expect(m.project).not.toHaveBeenCalled();
  });
  it("lets an authenticated client initiate a direct conversation in their own scope", async () => {
    const response = await initiate(new Request("https://coolink.test/messages", { method: "POST" }));
    expect(response.status).toBe(201);
    expect(m.create.mock.calls[0][0].data).toMatchObject({ clientId: "client-self", author: "client" });
  });
  it("requires authentication before reading direct messages", async () => {
    m.client.mockResolvedValue(null);
    expect((await clientDirect(new Request("https://coolink.test/messages"))).status).toBe(401);
    expect(m.direct).not.toHaveBeenCalled();
  });
});
