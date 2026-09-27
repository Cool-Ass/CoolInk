import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ client: vi.fn(), origin: vi.fn(), find: vi.fn(), update: vi.fn(), restore: vi.fn(), activity: vi.fn() }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: mock.client }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: mock.origin }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: vi.fn() }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { tattooProject: { updateMany: mock.restore }, $transaction: (fn: (tx: unknown) => unknown) => fn({ tattooProject: { findFirst: mock.find, update: mock.update }, projectActivity: { create: mock.activity } }) } }));
import { DELETE, PATCH } from "../app/api/client/projects/[id]/route";
const params = { params: Promise.resolve({ id: "project" }) };
const archive = () => DELETE(new Request("http://localhost/api/client/projects/project", { method: "DELETE" }), params);
beforeEach(() => { vi.clearAllMocks(); mock.origin.mockReturnValue(true); mock.client.mockResolvedValue({ id: "client" }); mock.find.mockResolvedValue({ clientArchivedAt: null, appointments: [{ status: "completed" }] }); mock.restore.mockResolvedValue({ count: 1 }); });
describe("client project archive", () => {
  it("archives without deleting appointments, media or history", async () => {
    expect((await archive()).status).toBe(200);
    expect(mock.find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "project", clientId: "client" } }));
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ data: { clientArchivedAt: expect.any(Date) } }));
    expect(mock.activity).toHaveBeenCalledOnce();
  });
  it("rejects other clients' projects", async () => { mock.find.mockResolvedValue(null); expect((await archive()).status).toBe(404); expect(mock.update).not.toHaveBeenCalled(); });
  it("requires cancellation of active visits first", async () => { mock.find.mockResolvedValue({ appointments: [{ status: "confirmed" }] }); expect((await archive()).status).toBe(409); expect(mock.update).not.toHaveBeenCalled(); });
  it("is idempotent", async () => { mock.find.mockResolvedValue({ clientArchivedAt: new Date(), appointments: [] }); expect((await archive()).status).toBe(200); expect(mock.update).not.toHaveBeenCalled(); });
  it("rejects foreign origins", async () => { mock.origin.mockReturnValue(false); expect((await archive()).status).toBe(403); });
  it("restores only the owner's project", async () => { expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ archived: false }) }), params)).status).toBe(200); expect(mock.restore).toHaveBeenCalledWith({ where: { id: "project", clientId: "client" }, data: { clientArchivedAt: null } }); });
});
