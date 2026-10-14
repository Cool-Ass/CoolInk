import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), forecast: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: m.query, appointment: { findMany: m.forecast } } }));
import { businessReports, forecastReceipts } from "@/lib/businessReports";
beforeEach(() => vi.resetAllMocks());
describe("business reporting definitions", () => {
  it("forecasts full PLN prices once and subtracts only verified paid deposits", () => {
    expect(forecastReceipts([{ price: 1400, depositStatus: "paid", depositAmount: 300 }, { price: 1000, depositStatus: "awaiting", depositAmount: 200 }, { price: null, depositStatus: "paid", depositAmount: 100 }])).toEqual({ grossCents: 240000, remainingCents: 210000, priced: 2, unpriced: 1 });
  });
  it("subtracts a reserved voucher and a paid deposit from future cash, without counting either twice", () => { expect(forecastReceipts([{ price: 700, depositStatus: "paid", depositAmount: 100, voucher: { amountCents: 30000, redeemedAt: null, cancelledAt: null } }])).toEqual({ grossCents: 70000, remainingCents: 30000, priced: 1, unpriced: 0 }); });
  it("caps a larger voucher at zero future cash and ignores revoked credit", () => { expect(forecastReceipts([{ price: 100, depositStatus: "not_required", depositAmount: null, voucher: { amountCents: 50000, redeemedAt: null, cancelledAt: null } }, { price: 200, depositStatus: "not_required", depositAmount: null, voucher: { amountCents: 50000, redeemedAt: null, cancelledAt: new Date() } }])).toMatchObject({ grossCents: 30000, remainingCents: 20000 }); });
  it("handles zero prices and prevents negative outstanding forecasts", () => { expect(forecastReceipts([{ price: 0, depositStatus: "not_required", depositAmount: null }, { price: 100, depositStatus: "paid", depositAmount: 150 }])).toEqual({ grossCents: 10000, remainingCents: 0, priced: 2, unpriced: 0 }); });
  it("reports paid revenue per matched session hour, never project estimates or voided ledgers", async () => {
    m.query.mockResolvedValueOnce([{ clients: 2 }]).mockResolvedValueOnce([{ paidCents: 280000, minutes: 480, missingSessions: 1 }]).mockResolvedValueOnce([]); m.forecast.mockResolvedValue([]);
    expect(await businessReports(new Date("2026-10-01"), new Date("2026-10-13"))).toMatchObject({ returningClients: 2, hourlyCents: 35000, workHours: 8, missingSessions: 1 });
    const returning = m.query.mock.calls[0][0].join(""), work = m.query.mock.calls[1][0].join(""), promotion = m.query.mock.calls[2][0].join("");
    expect(returning).toContain('old."startsAt" < a."startsAt"'); expect(returning).toContain("DISTINCT"); expect(work).toContain('e."voidedAt" IS NULL'); expect(work).toContain('e."createdAt"'); expect(work).not.toContain("estimatedPrice"); expect(promotion).toContain('a."promotionId" = p.id');
    expect(m.forecast.mock.calls[0][0].where).toMatchObject({ loyaltyEntry: { is: null }, status: { in: ["confirmed", "deposit_required", "deposit_paid"] } });
  });
  it("does not divide by zero or invent revenue when there are no sessions", async () => { m.query.mockResolvedValueOnce([{ clients: 0 }]).mockResolvedValueOnce([{ paidCents: 0, minutes: 0, missingSessions: 0 }]).mockResolvedValueOnce([]); m.forecast.mockResolvedValue([]); expect((await businessReports(new Date(0), new Date())).hourlyCents).toBeNull(); });
});
