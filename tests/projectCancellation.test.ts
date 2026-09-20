import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ origin: vi.fn(), client: vi.fn(), lock: vi.fn(), offer: vi.fn(), sync: vi.fn(), tx: { tattooProject: { findFirst: vi.fn(), update: vi.fn() }, appointment: { findMany: vi.fn(), updateMany: vi.fn() }, projectActivity: { create: vi.fn() }, waitlistEntry: { updateMany: vi.fn() } } }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: typeof m.tx) => unknown) => run(m.tx) } }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: m.lock }));
vi.mock("@/lib/waitlistAutomation", () => ({ offerReleasedRange: m.offer }));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ syncAppointmentToGoogle: m.sync }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: async () => {} }));
import { POST } from "../app/api/client/projects/[id]/cancel/route";
const call = () => POST(new Request("http://localhost/api/client/projects/p/cancel", { method: "POST" }), { params: Promise.resolve({ id: "p" }) });
beforeEach(() => { vi.resetAllMocks(); m.origin.mockReturnValue(true); m.client.mockResolvedValue({ id: "client", firstName: "A", lastName: "B" }); m.tx.tattooProject.findFirst.mockResolvedValue({ id: "p", status: "confirmed" }); m.tx.appointment.findMany.mockResolvedValue([{ id: "a", startsAt: new Date("2099-01-01"), endsAt: new Date("2099-01-02") }]); m.offer.mockResolvedValue(null); m.sync.mockResolvedValue(null); });
describe("project cancellation", () => {
  it("locks ownership check, closes its own waitlist and offers released slots", async () => { expect((await call()).status).toBe(200); expect(m.lock).toHaveBeenCalled(); expect(m.tx.tattooProject.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p", clientId: "client" } })); expect(m.tx.waitlistEntry.updateMany).toHaveBeenCalled(); expect(m.offer).toHaveBeenCalledOnce(); });
  it("does not mutate another client's project", async () => { m.tx.tattooProject.findFirst.mockResolvedValue(null); expect((await call()).status).toBe(404); expect(m.tx.appointment.updateMany).not.toHaveBeenCalled(); expect(m.offer).not.toHaveBeenCalled(); });
  it("does not offer twice after repeated cancellation", async () => { m.tx.tattooProject.findFirst.mockResolvedValue({ id: "p", status: "cancelled" }); expect((await call()).status).toBe(200); expect(m.offer).not.toHaveBeenCalled(); });
});
