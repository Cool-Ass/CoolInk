import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ origin: vi.fn(), rate: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.rate, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: vi.fn() }));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ syncAppointmentToGoogle: vi.fn() }));
import { POST } from "../app/api/client/appointments/route";
beforeEach(() => { vi.resetAllMocks(); m.origin.mockReturnValue(true); m.rate.mockResolvedValue({ allowed: true }); m.client.mockResolvedValue(null); });
describe("booking failure boundary", () => {
  it.each([["P2028", "BOOKING_TRANSACTION_TIMEOUT"], ["P2024", "BOOKING_POOL_TIMEOUT"], ["P1001", "BOOKING_DATABASE_UNAVAILABLE"], ["P2003", "BOOKING_SAVE_FAILED"]])("returns a safe classified response for %s", async (code, expected) => {
    m.rate.mockRejectedValue(Object.assign(new Error("Private client name / password / database URL"), { code }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = await POST(new Request("https://coolink.test/api/client/appointments", { method: "POST" }));
      expect(response.status).toBe(503); const body = await response.json(); expect(body.errorCode).toBe(expected); expect(JSON.stringify(body)).not.toMatch(/Private|password|database URL/);
      expect(log).toHaveBeenCalledWith("appointment_booking_failed", { code });
    } finally { log.mockRestore(); }
  });
  it("still rejects cross-origin requests before any database use", async () => { m.origin.mockReturnValue(false); expect((await POST(new Request("https://coolink.test/api/client/appointments", { method: "POST" }))).status).toBe(403); expect(m.rate).not.toHaveBeenCalled(); });
  it("still requires a client session", async () => { expect((await POST(new Request("https://coolink.test/api/client/appointments", { method: "POST" }))).status).toBe(401); });
});
