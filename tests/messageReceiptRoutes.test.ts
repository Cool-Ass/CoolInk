import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ client: vi.fn(), admin: vi.fn(), origin: vi.fn(), project: vi.fn(), directClient: vi.fn(), direct: vi.fn(), messages: vi.fn() }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/auth", () => ({ getCurrentAdmin: m.admin }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: vi.fn(), tooManyRequests: vi.fn() }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: vi.fn(), sendPushToClient: vi.fn() }));
vi.mock("@/lib/chatImage", () => ({ readChatInput: vi.fn(), serializeDirectMessage: vi.fn() }));
vi.mock("@/lib/clientMediaWrite", () => ({ withClientMediaWrite: vi.fn() }));
vi.mock("@/lib/privateMedia", () => ({ privateImageUrl: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { tattooProject: { findUnique: m.project, findFirst: m.project }, client: { findUnique: m.directClient }, $transaction: (run: (tx: unknown) => unknown) => run({ directMessage: { updateMany: m.direct }, projectMessage: { updateMany: m.messages } }) } }));
import { PATCH as clientDirect } from "../app/api/client/messages/route";
import { PATCH as clientProject } from "../app/api/client/projects/[id]/messages/route";
import { PATCH as adminDirect } from "../app/api/admin/clients/[id]/messages/route";
import { PATCH as adminProject } from "../app/api/admin/projects/[id]/messages/route";
const routes = [
 { name: "client direct", run: clientDirect, admin: false, project: false },
 { name: "client project", run: clientProject, admin: false, project: true },
 { name: "admin direct", run: adminDirect, admin: true, project: false },
 { name: "admin project", run: adminProject, admin: true, project: true },
];
const req = (state = "delivered") => new Request("http://localhost/messages", { method: "PATCH", body: JSON.stringify({ state, ids: ["received-id", "foreign-id"] }) });
beforeEach(() => { vi.resetAllMocks(); m.client.mockResolvedValue({ id: "client" }); m.admin.mockResolvedValue({ id: "admin" }); m.origin.mockReturnValue(true); m.project.mockResolvedValue({ id: "target" }); m.directClient.mockResolvedValue({ id: "target" }); m.direct.mockResolvedValue({ count: 1 }); m.messages.mockResolvedValue({ count: 1 }); });
describe.each(routes)("$name recipient receipts", route => {
 const call = (request = req()) => route.run(request, { params: Promise.resolve({ id: "target" }) });
 it("requires recipient authentication", async () => { (route.admin ? m.admin : m.client).mockResolvedValue(null); expect((await call()).status).toBe(401); expect(m.direct).not.toHaveBeenCalled(); expect(m.messages).not.toHaveBeenCalled(); });
 it("rejects cross-origin acknowledgement", async () => { m.origin.mockReturnValue(false); expect((await call()).status).toBe(403); });
 it("never marks delivery as read and scopes foreign/sender IDs away", async () => {
   expect((await call()).status).toBe(200);
   const update = route.project ? m.messages : m.direct;
   expect(update).toHaveBeenCalledTimes(1);
   expect(update).toHaveBeenCalledWith({ where: { [route.project ? "projectId" : "clientId"]: route.project || route.admin ? "target" : "client", author: route.admin ? "client" : "admin", id: { in: ["received-id", "foreign-id"] }, deliveredAt: null }, data: { deliveredAt: expect.any(Date) } });
 });
 it("records reading without overwriting earlier receipt timestamps", async () => {
   expect((await call(req("read"))).status).toBe(200);
   const update = route.project ? m.messages : m.direct;
   expect(update).toHaveBeenCalledTimes(2);
   expect(update.mock.calls[1][0]).toMatchObject({ where: { readAt: null, author: route.admin ? "client" : "admin" }, data: { readAt: expect.any(Date) } });
 });
 it("rejects invalid receipt bodies", async () => { expect((await call(req("sent"))).status).toBe(400); });
});
it("client project receipts require an owned project", async () => { m.project.mockResolvedValue(null); expect((await clientProject(req(), { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404); expect(m.messages).not.toHaveBeenCalled(); expect(m.project).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "foreign", clientId: "client" }) })); });
