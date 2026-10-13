import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { flashClaimWhere, validateFlashConfiguration } from "@/lib/flashBooking";
import { resolveFlashBooking } from "@/lib/flashBookingServer";
const config = { flashEnabled: true, flashUnique: true, flashSize: "10 cm", flashPrice: 700, flashDurationMinutes: 120, flashDepositAmount: 100 };
describe("Flash configuration", () => {
  it("preserves existing portfolio defaults and accepts whole PLN", () => {
    expect(validateFlashConfiguration({})).toMatchObject({ flashEnabled: false, flashUnique: true, flashPrice: null });
    expect(validateFlashConfiguration(config)).toEqual(config);
  });
  it.each([{ flashPrice: -1 }, { flashPrice: true }, { flashPrice: 10.5 }, { flashDurationMinutes: 31 }, { flashDurationMinutes: 900 }, { flashDepositAmount: 701 }, { flashSize: "" }, { flashUnique: "false" }])("rejects unsafe settings %j", patch => {
    expect(() => validateFlashConfiguration({ ...config, ...patch })).toThrow();
  });
  it("leaves claimed and completed projects unavailable, but releases entirely cancelled sessions", () => {
    expect(flashClaimWhere).toEqual({ OR: [{ status: { not: "cancelled" }, appointments: { none: {} } }, { appointments: { some: { status: { notIn: ["cancelled", "no_show"] } } } }] });
    expect(flashClaimWhere.OR[1]).not.toHaveProperty("status");
  });
});
describe("Flash claim within canonical booking transaction", () => {
  const updatedAt = new Date("2026-10-13T08:00:00Z"), start = new Date("2030-10-13T10:00:00Z"), end = new Date("2030-10-13T12:00:00Z");
  const flash = { ...config, id: "flash", published: true, title: "Wzór", updatedAt, flashProjects: [] as { id: string }[] };
  const db = (value: unknown) => ({ portfolioItem: { findUnique: vi.fn().mockResolvedValue(value) } }) as unknown as Prisma.TransactionClient;
  it("returns authoritative stored price/deposit and scopes active claims", async () => {
    const tx = db(flash);
    expect(await resolveFlashBooking(tx, "flash", updatedAt.toISOString(), start, end)).toMatchObject({ flashPrice: 700, flashDepositAmount: 100 });
    expect(tx.portfolioItem.findUnique).toHaveBeenCalledWith(expect.objectContaining({ include: { flashProjects: { where: flashClaimWhere, take: 1, select: { id: true } } } }));
  });
  it.each([null, { ...flash, published: false }, { ...flash, flashEnabled: false }, { ...flash, flashPrice: null }])("rejects unavailable design", async value => {
    await expect(resolveFlashBooking(db(value), "flash", updatedAt.toISOString(), start, end)).rejects.toThrow("FLASH_UNAVAILABLE");
  });
  it("rejects stale displayed terms", async () => {
    await expect(resolveFlashBooking(db(flash), "flash", "2026-01-01", start, end)).rejects.toThrow("FLASH_CHANGED");
  });
  it("rejects second unique claim even on a different day", async () => {
    await expect(resolveFlashBooking(db({ ...flash, flashProjects: [{ id: "previous" }] }), "flash", updatedAt.toISOString(), start, end)).rejects.toThrow("FLASH_CLAIMED");
  });
  it("allows explicitly repeatable designs", async () => {
    await expect(resolveFlashBooking(db({ ...flash, flashUnique: false, flashProjects: [{ id: "previous" }] }), "flash", updatedAt.toISOString(), start, end)).resolves.toBeTruthy();
  });
  it("rejects client-supplied duration changes", async () => {
    await expect(resolveFlashBooking(db(flash), "flash", updatedAt.toISOString(), start, new Date(start.getTime() + 1800000))).rejects.toThrow("FLASH_DURATION");
  });
});
