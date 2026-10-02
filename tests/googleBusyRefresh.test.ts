import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ list: vi.fn(), current: vi.fn(), mark: vi.fn(), update: vi.fn(), existing: vi.fn(), missing: vi.fn(), events: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/googleCalendarCrypto", () => ({ decryptGoogleRefreshToken: () => "token" }));
vi.mock("@/lib/googleCalendar", async importOriginal => ({ ...await importOriginal<typeof import("../lib/googleCalendar")>(), googleCalendarRequest: m.events, refreshGoogleCalendarAccessToken: m.token }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  googleCalendarConnection: { findMany: m.list, findUnique: m.current, update: vi.fn() },
  googleCalendarEventSync: { findUnique: m.existing, findMany: m.missing, update: m.update, updateMany: m.mark },
  $transaction: (fn: (tx: unknown) => unknown) => fn({ googleCalendarEventSync: { update: m.update } }),
} }));
import { refreshGoogleBusyCalendars } from "../lib/googleCalendarSyncEngine";
const connection = { id: "studio", active: true, encryptedRefreshToken: "encrypted", selections: [{ calendarId: "cal", role: "busy", enabled: true }] };
beforeEach(() => { vi.clearAllMocks(); m.list.mockResolvedValue([connection]); m.current.mockResolvedValue(connection); m.token.mockResolvedValue({ access_token: "access" }); m.events.mockResolvedValue({ items: [] }); m.missing.mockResolvedValue([]); });
describe("scheduled busy imports", () => {
  it("imports without writing Google appointments and handles an empty remote calendar", async () => {
    expect(await refreshGoogleBusyCalendars()).toEqual({ refreshed: 1, failed: 0 });
    expect(m.events.mock.calls[0][2]).toBeUndefined();
    expect(m.list.mock.calls[0][0].take).toBe(5);
  });
  it("retains missing records and their association instead of deleting data", async () => {
    m.missing.mockResolvedValue([{ id: "sync", calendarEventId: "local", googleEventId: "removed" }]);
    await refreshGoogleBusyCalendars();
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "sync" }, data: expect.objectContaining({ syncStatus: "DELETED_REMOTE" }) }));
    expect(m.update.mock.calls[0][0].data).not.toHaveProperty("calendarEventId");
  });
  it("deactivates imported blocks if disconnected during the request", async () => {
    m.current.mockResolvedValue({ ...connection, active: false });
    await refreshGoogleBusyCalendars();
    expect(m.mark).toHaveBeenCalledWith({ where: { connectionId: "studio", appointmentId: null, googleCalendarId: { notIn: [] } }, data: { syncStatus: "INACTIVE" } });
  });
  it("reports API failure without aborting the reminder task or exposing token details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.events.mockRejectedValue(new Error("private details"));
    expect(await refreshGoogleBusyCalendars()).toEqual({ refreshed: 0, failed: 1 });
    expect(m.update).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).not.toContain("private details");
    log.mockRestore();
  });
});
