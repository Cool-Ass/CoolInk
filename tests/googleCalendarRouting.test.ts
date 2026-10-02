import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ connections: vi.fn(), connection: vi.fn(), appointment: vi.fn(), sync: vi.fn(), upsert: vi.fn(), remove: vi.fn(), errors: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  appointment: { findUnique: m.appointment },
  googleCalendarConnection: { findMany: m.connections, findUnique: m.connection },
  googleCalendarEventSync: { findUnique: m.sync, updateMany: m.errors },
  siteSetting: { upsert: m.upsert, deleteMany: m.remove },
} }));
vi.mock("@/lib/googleExportOutbox", () => ({ claimGoogleExport: async () => ({ key: "google_retry:visit", value: "claim", nonce: "generation" }), releaseGoogleExport: async (_claim: unknown, completed: boolean) => { if (completed) await m.remove(); } }));
import { syncAppointmentToGoogle, unambiguousExportConnection } from "../lib/googleCalendarSyncEngine";
beforeEach(() => { vi.resetAllMocks(); m.connections.mockResolvedValue([]); });
describe("Google connection ownership", () => {
  it("rejects ambiguous export instead of choosing most recently updated account", async () => {
    m.connections.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    await expect(unambiguousExportConnection()).rejects.toThrow("Wiele aktywnych");
    expect(m.connections.mock.calls[0][0]).not.toHaveProperty("orderBy");
  });
  it("uses the only configured connection", async () => {
    m.connections.mockResolvedValue([{ id: "studio" }]);
    expect(await unambiguousExportConnection()).toEqual({ id: "studio" });
  });
  it("does not fall back to another account when a linked account is disabled", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.appointment.mockResolvedValue({ id: "visit" });
    m.sync.mockResolvedValue({ connectionId: "original" });
    m.connection.mockResolvedValue({ id: "original", active: false });
    expect(await syncAppointmentToGoogle("visit")).toBe(false);
    expect(m.connection).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "original" } }));
    expect(m.connections).not.toHaveBeenCalled();
    expect(m.remove).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
