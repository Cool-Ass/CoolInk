import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), client: vi.fn(), origin: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { accountDeletionRequest: { upsert: mocks.upsert } } }));
vi.mock("../lib/clientAuth", () => ({ getCurrentClient: mocks.client, CLIENT_ACCESS_COOKIE: "access", CLIENT_REFRESH_COOKIE: "refresh" }));
vi.mock("../lib/requestSecurity", () => ({ isSameOrigin: mocks.origin }));
import { DELETE } from "../app/api/client/profile/route";
beforeEach(() => { vi.resetAllMocks(); mocks.client.mockResolvedValue({ id: "own-client" }); mocks.origin.mockReturnValue(true); mocks.upsert.mockResolvedValue({ id: "existing-request" }); });
describe("privacy request receipt is idempotent", () => {
  it("does not postpone the original receipt date or erase an existing decision on retry", async () => {
    const result = await DELETE(new Request("https://www.coolinktattoo.pl/api/client/profile", { method: "DELETE" }));
    expect(result.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith({ where: { clientId: "own-client" }, update: {}, create: { clientId: "own-client" } });
    expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("does not register unauthenticated or cross-origin requests", async () => {
    mocks.origin.mockReturnValue(false);
    expect((await DELETE(new Request("https://example.invalid"))).status).toBe(403);
    mocks.origin.mockReturnValue(true); mocks.client.mockResolvedValue(null);
    expect((await DELETE(new Request("https://example.invalid"))).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
