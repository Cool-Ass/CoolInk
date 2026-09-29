import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ lockedFind: vi.fn(), adminFind: vi.fn(), lock: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: async () => ({ id: "client" }) }));
vi.mock("@/lib/auth", () => ({ getCurrentAdmin: async () => ({ id: "admin", role: "owner" }) }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: () => true, rateLimit: async () => ({ allowed: true }) }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: m.lock, validAppointmentRange: () => true, bookingConflict: async () => ({}), bookingConflictMessage: () => "" }));
vi.mock("@/lib/appointmentAvailability", () => ({ verifyExplicitAppointmentAvailability: async () => ({ ok: true }) }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: vi.fn() }));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ syncAppointmentToGoogle: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  studioDocument: { findMany: async () => [] },
  availableSlot: { findFirst: async () => ({ title: "Tatuaż" }) },
  tattooProject: { findFirst: async () => ({ id: "project" }) },
  $transaction: (run: (tx: unknown) => unknown) => run({
    tattooProject: { findFirst: m.lockedFind, findUnique: m.adminFind },
    appointment: { create: m.create },
  }),
} }));
import { POST as clientBooking } from "../app/api/client/appointments/route";
import { POST as adminBooking } from "../app/api/admin/appointments/route";
const request = () => new Request("https://coolink.test/api/appointments", { method: "POST", body: JSON.stringify({ projectId: "project", confirmationAcknowledged: true, startsAt: "2027-01-01T10:00:00Z", endsAt: "2027-01-01T11:00:00Z" }) });
beforeEach(() => { vi.clearAllMocks(); m.lockedFind.mockResolvedValue({ clientArchivedAt: new Date() }); m.adminFind.mockResolvedValue({ id: "project", clientArchivedAt: new Date() }); });
describe("archive and booking serialization", () => {
  it("rechecks archive after the calendar lock even when the earlier lookup succeeded", async () => {
    expect((await clientBooking(request())).status).toBe(409);
    expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.lockedFind.mock.invocationCallOrder[0]);
    expect(m.lockedFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "project", clientId: "client" } }));
    expect(m.create).not.toHaveBeenCalled();
  });
  it("rejects a project that disappeared before acquiring the lock", async () => {
    m.lockedFind.mockResolvedValue(null);
    expect((await clientBooking(request())).status).toBe(409);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("also rejects archived projects for admin bookings", async () => {
    expect((await adminBooking(request())).status).toBe(409);
    expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.adminFind.mock.invocationCallOrder[0]);
    expect(m.create).not.toHaveBeenCalled();
  });
});
