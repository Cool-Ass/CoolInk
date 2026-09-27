import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ upsert: vi.fn(), remove: vi.fn(), find: vi.fn(), connection: vi.fn(), errors: vi.fn(), queued: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { appointment: { findUnique: mock.find }, googleCalendarConnection: { findFirst: mock.connection }, googleCalendarEventSync: { updateMany: mock.errors }, siteSetting: { upsert: mock.upsert, deleteMany: mock.remove, findMany: mock.queued } } }));
import { syncAppointmentToGoogle, retryGoogleCalendarExports } from "../lib/googleCalendarSyncEngine";
beforeEach(() => { vi.resetAllMocks(); mock.queued.mockResolvedValue([]); mock.find.mockResolvedValue(null); mock.connection.mockResolvedValue(null); });
describe("durable Google retries", () => {
  it("persists a marker before attempting export and acknowledges that exact version", async () => {
    await syncAppointmentToGoogle("visit");
    const data = mock.upsert.mock.calls[0][0];
    expect(data.where.key).toBe("google_retry:visit");
    expect(mock.remove).toHaveBeenCalledWith({ where: { key: data.where.key, value: data.create.value } });
    expect(mock.upsert.mock.invocationCallOrder[0]).toBeLessThan(mock.find.mock.invocationCallOrder[0]);
  });
  it("keeps failed work and marks the integration error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.find.mockRejectedValue(new Error("private details"));
    expect(await syncAppointmentToGoogle("visit")).toBe(false);
    expect(mock.remove).not.toHaveBeenCalled();
    expect(mock.errors).toHaveBeenCalledWith(expect.objectContaining({ where: { appointmentId: "visit" }, data: expect.objectContaining({ syncStatus: "ERROR" }) }));
    expect(log.mock.calls.flat().join(" ")).not.toContain("private details");
    log.mockRestore();
  });
  it("limits the retry batch", async () => {
    expect(await retryGoogleCalendarExports()).toEqual({ checked: 0, synced: 0 });
    expect(mock.queued).toHaveBeenCalledWith(expect.objectContaining({ take: 25, where: { key: { startsWith: "google_retry:" } } }));
  });
});
