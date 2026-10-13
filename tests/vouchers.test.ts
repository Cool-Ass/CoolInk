import { beforeEach, describe, expect, it, vi } from "vitest";
import { availableVoucher, assertVoucherVisitChange } from "../lib/vouchers";
import type { Prisma } from "@prisma/client";
const findUnique = vi.fn(); const tx = { voucher: { findUnique } } as unknown as Prisma.TransactionClient;
const start = new Date("2030-01-01"), code = "CI-" + "A".repeat(32);
beforeEach(() => { findUnique.mockReset(); findUnique.mockResolvedValue({ id: "v", amountCents: 50000, validUntil: new Date("2030-12-31"), clientId: null, appointment: null, redeemedAt: null, cancelledAt: null }); });
describe("voucher ownership, reservation and immutable consumption", () => {
  it("reads only the normalized exact code", async () => { expect((await availableVoucher(tx, code.toLowerCase(), "c", start)).id).toBe("v"); expect(findUnique.mock.calls[0][0].where).toEqual({ code }); });
  it.each([{ redeemedAt: new Date() }, { cancelledAt: new Date() }, { clientId: "other" }, { validUntil: new Date("2029-12-31") }, { appointment: { id: "other", status: "confirmed" } }])("rejects unavailable voucher %j", async patch => { findUnique.mockResolvedValue({ ...(await findUnique()), ...patch }); await expect(availableVoucher(tx, code, "c", start)).rejects.toThrow(); });
  it("allows rebooking an unspent cancelled reservation only for its existing owner", async () => { findUnique.mockResolvedValue({ ...(await findUnique()), clientId: "c", appointment: { id: "cancelled", status: "cancelled" } }); await expect(availableVoucher(tx, code, "c", start)).resolves.toMatchObject({ id: "v" }); await expect(availableVoucher(tx, code, "other", start)).rejects.toThrow(); });
  it("rejects moving a linked visit past voucher validity", async () => { await expect(assertVoucherVisitChange(tx, "a", new Date("2031-01-01"), "confirmed", "tattoo")).rejects.toThrow(); });
  it("does not resurrect redeemed evidence through cancellation or repricing", async () => { findUnique.mockResolvedValue({ ...(await findUnique()), redeemedAt: new Date(), appointment: { startsAt: start, serviceType: "tattoo", price: 500 } }); await expect(assertVoucherVisitChange(tx, "a", start, "cancelled", "tattoo", 500)).rejects.toThrow(); await expect(assertVoucherVisitChange(tx, "a", start, "completed", "tattoo", 600)).rejects.toThrow(); await expect(assertVoucherVisitChange(tx, "a", start, "completed", "tattoo", 500)).resolves.toBeUndefined(); });
});
