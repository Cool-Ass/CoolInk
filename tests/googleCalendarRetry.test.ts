import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ upsert: vi.fn(), remove: vi.fn(), find: vi.fn(), connection: vi.fn(), errors: vi.fn(), query: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mock.query, $executeRaw: mock.execute, appointment: { findUnique: mock.find }, googleCalendarConnection: { findFirst: mock.connection }, googleCalendarEventSync: { updateMany: mock.errors }, siteSetting: { upsert: mock.upsert, deleteMany: mock.remove } } }));
import { syncAppointmentToGoogle, retryGoogleCalendarExports } from "../lib/googleCalendarSyncEngine";
beforeEach(() => { vi.resetAllMocks(); mock.query.mockResolvedValue([{ key: "google_retry:visit", value: JSON.stringify({ nonce: "revision", lease: "lease" }) }]); mock.find.mockResolvedValue(null); mock.connection.mockResolvedValue(null); });
describe("durable Google retries", () => {
  it("persists and claims a marker before export, retaining unresolved work", async () => {
    await syncAppointmentToGoogle("visit");
    const data = mock.upsert.mock.calls[0][0];
    expect(data.where.key).toBe("google_retry:visit");
    expect(mock.remove).not.toHaveBeenCalled();
    expect(mock.execute).toHaveBeenCalled();
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
    mock.query.mockResolvedValue([]);
    expect(await retryGoogleCalendarExports()).toEqual({ checked: 0, synced: 0 });
    const sql = mock.query.mock.calls[0][0].join("");
    expect(sql).toContain("LIMIT 25");
    expect(sql).toContain("nextAttemptAt");
    expect(sql).toContain("leaseUntil");
  });
  it("does not export work leased by another worker", async () => {
    mock.query.mockResolvedValue([]);
    expect(await syncAppointmentToGoogle("visit")).toBe(false);
    expect(mock.find).not.toHaveBeenCalled();
  });
});
