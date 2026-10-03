import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), clients: vi.fn(), requests: vi.fn(), stamps: vi.fn() }));
vi.mock("../lib/auth", () => ({ getCurrentAdmin: mocks.admin }));
vi.mock("../lib/prisma", () => ({ prisma: { client: { findMany: mocks.clients }, accountDeletionRequest: { findMany: mocks.requests }, loyaltyEntry: { groupBy: mocks.stamps } } }));
vi.mock("../components/admin/NewClientForm", () => ({ default: () => null }));
vi.mock("../components/admin/AdminClientList", () => ({ default: () => null }));
import ClientsPage from "../app/admin/(dashboard)/clients/page";
beforeEach(() => { vi.resetAllMocks(); mocks.clients.mockResolvedValue([]); mocks.requests.mockResolvedValue([]); mocks.stamps.mockResolvedValue([]); });
describe("privacy queue role boundary", () => {
  it.each(["artist", "manager", "receptionist", "unknown"])("does not fetch privacy requests for %s", async (role) => {
    mocks.admin.mockResolvedValue({ id: "admin", role });
    await ClientsPage();
    expect(mocks.requests).not.toHaveBeenCalled();
  });
  it("fetches the oldest pending requests for the owner only", async () => {
    mocks.admin.mockResolvedValue({ id: "owner", role: "owner" });
    await ClientsPage();
    expect(mocks.requests).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { in: ["pending", "reviewing", "awaiting_execution", "retained", "executing", "execution_failed", "completed_retained", "retention_review", "awaiting_retention_execution", "retention_retained"] } }, orderBy: { requestedAt: "asc" } }));
  });
});
