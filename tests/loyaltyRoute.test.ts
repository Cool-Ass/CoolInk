import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  admin: vi.fn(), origin: vi.fn(), limit: vi.fn(), balance: vi.fn(),
  tx: { $queryRaw: vi.fn(), appointment: { findFirst: vi.fn() }, loyaltyEntry: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, clientNotification: { create: vi.fn() }, projectActivity: { create: vi.fn() } },
}));
vi.mock("@/lib/auth", () => ({ getCurrentAdmin: mock.admin }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: mock.origin, rateLimit: mock.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: typeof mock.tx) => unknown) => run(mock.tx) } }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: vi.fn() }));
vi.mock("@/lib/loyalty", () => ({ loyaltyBalance: mock.balance }));
import { POST } from "../app/api/admin/clients/[id]/loyalty/route";

const settle = { action: "settle", appointmentId: "visit", grossCents: 140_000, paid: true, redeem: false };
const call = (body: unknown) => POST(new Request("http://localhost/api/admin/clients/client/loyalty", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "client" }) });

beforeEach(() => {
  vi.resetAllMocks();
  mock.admin.mockResolvedValue({ id: "admin", role: "owner" });
  mock.origin.mockReturnValue(true); mock.limit.mockResolvedValue({ allowed: true });
  mock.balance.mockResolvedValue(4); mock.tx.$queryRaw.mockResolvedValue([{ id: "client" }]);
  mock.tx.appointment.findFirst.mockResolvedValue({ id: "visit", projectId: "project", status: "completed", serviceType: "tattoo", startsAt: new Date("2025-01-01"), project: { kind: "tattoo", title: "Tatuaż" } });
});

describe("loyalty route security and lifecycle", () => {
  it("rejects foreign origins", async () => { mock.origin.mockReturnValue(false); expect((await call(settle)).status).toBe(403); expect(mock.admin).not.toHaveBeenCalled(); });
  it.each([null, { id: "artist", role: "artist" }, { id: "receptionist", role: "receptionist" }])("rejects unauthorized actor %s", async (admin) => { mock.admin.mockResolvedValue(admin); expect((await call(settle)).status).toBe(403); });
  it("limits mutations", async () => { mock.limit.mockResolvedValue({ allowed: false }); expect((await call(settle)).status).toBe(429); });
  it("scopes appointments to the requested client", async () => { mock.tx.appointment.findFirst.mockResolvedValue(null); expect((await call(settle)).status).toBe(409); expect(mock.tx.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "visit", project: { clientId: "client" } } })); });
  it("does not award on an unconfirmed payment", async () => { expect((await call({ ...settle, paid: false })).status).toBe(409); expect(mock.tx.loyaltyEntry.create).not.toHaveBeenCalled(); });
  it("awards and notifies on the fifth stamp", async () => { expect((await call(settle)).status).toBe(200); expect(mock.tx.loyaltyEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stamps: 1, paidCents: 140_000 }) })); expect(mock.tx.clientNotification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: "Masz rabat −50% na tatuaż!" }) })); });
  it("replays the same settlement without duplicating stamps or notifications", async () => { mock.tx.loyaltyEntry.findUnique.mockResolvedValue({ grossCents: 140_000, stamps: 1, voidedAt: null }); expect((await call(settle)).status).toBe(200); expect(mock.tx.loyaltyEntry.create).not.toHaveBeenCalled(); expect(mock.tx.clientNotification.create).not.toHaveBeenCalled(); });
  it("rejects changing an existing settlement", async () => { mock.tx.loyaltyEntry.findUnique.mockResolvedValue({ grossCents: 80_000, stamps: 1 }); expect((await call(settle)).status).toBe(409); });
  it("rejects redemption before five stamps", async () => { expect((await call({ ...settle, redeem: true })).status).toBe(409); });
  it("redeems five stamps without awarding a new stamp", async () => { mock.balance.mockResolvedValue(5); expect((await call({ ...settle, redeem: true })).status).toBe(200); expect(mock.tx.loyaltyEntry.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stamps: -5, paidCents: 70_000 }) })); });
  it("rejects duplicate paper cards", async () => { mock.tx.loyaltyEntry.findUnique.mockResolvedValue({ id: "paper" }); expect((await call({ action: "paper", stamps: 5, note: "Karta sprawdzona" })).status).toBe(409); });
  it("prevents removing already spent stamps", async () => { mock.balance.mockResolvedValue(0); mock.tx.loyaltyEntry.findFirst.mockResolvedValue({ id: "entry", stamps: 1 }); expect((await call({ action: "void", entryId: "entry", note: "Zwrot" })).status).toBe(409); });
  it("returns redeemed stamps when reversing a discount", async () => { mock.balance.mockResolvedValue(0); mock.tx.loyaltyEntry.findFirst.mockResolvedValue({ id: "entry", stamps: -5 }); expect((await call({ action: "void", entryId: "entry", note: "Zwrot" })).status).toBe(200); expect(mock.tx.loyaltyEntry.update).toHaveBeenCalled(); });
});
