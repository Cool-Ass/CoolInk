import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ access: vi.fn(), client: vi.fn(), origin: vi.fn(), limit: vi.fn(), find: vi.fn(), create: vi.fn(), audit: vi.fn(), available: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: vi.fn() }));
vi.mock("@/lib/vouchers", () => ({ availableVoucher: m.available, VoucherError: class VoucherError extends Error {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (run: (tx: unknown) => unknown) => run({ voucher: { findUnique: m.find, create: m.create }, adminAuditLog: { create: m.audit } }) } }));
import { POST as issue } from "../app/api/admin/vouchers/route";
import { POST as preview } from "../app/api/client/vouchers/preview/route";
const data = { amount: "300.50", recipientName: "Jan Kowalski", validUntil: "2035-01-01", idempotencyKey: "11111111-1111-4111-8111-111111111111" };
const request = (body: unknown = data) => new Request("http://localhost/voucher", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); m.access.mockResolvedValue({ ok: true, admin: { id: "owner" } }); m.client.mockResolvedValue({ id: "client" }); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: true }); m.create.mockImplementation(async input => ({ id: "v", ...input.data })); m.available.mockResolvedValue({ amountCents: 30050, validUntil: new Date("2035-01-01"), recipientName: "Private", createdById: "private" }); });
describe("voucher issuance authorization and idempotency", () => {
 it("requires finance.manage rather than ordinary admin access", async () => { m.access.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) }); expect((await issue(request())).status).toBe(403); expect(m.access).toHaveBeenCalledWith("finance.manage"); expect(m.create).not.toHaveBeenCalled(); });
 it("rejects CSRF, limits, malformed values and invalid idempotency", async () => {
   m.origin.mockReturnValue(false); expect((await issue(request())).status).toBe(403);
   m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: false }); expect((await issue(request())).status).toBe(429);
   m.limit.mockResolvedValue({ allowed: true }); expect((await issue(request({ ...data, amount: "-1" }))).status).toBe(400);
   expect((await issue(request({ ...data, idempotencyKey: "bad" }))).status).toBe(400);
   expect(m.create).not.toHaveBeenCalled();
 });
 it("creates an unpredictable one-use bearer code and no received payment", async () => { const res = await issue(request()); expect(res.status).toBe(201); const body = await res.json(); expect(body.code).toMatch(/^CI-[A-F0-9]{32}$/); expect(m.create.mock.calls[0][0].data).toMatchObject({ amountCents: 30050, issueKey: "owner:" + data.idempotencyKey }); expect(m.create.mock.calls[0][0].data.redeemedAt).toBeUndefined(); expect(m.audit).toHaveBeenCalledTimes(1); expect(res.headers.get("cache-control")).toContain("no-store"); });
 it("retries the same request without another voucher or audit entry", async () => { await issue(request()); const saved = m.create.mock.calls[0][0].data; m.find.mockResolvedValue(saved); const res = await issue(request()); expect((await res.json()).code).toBe(saved.code); expect(m.create).toHaveBeenCalledTimes(1); expect(m.audit).toHaveBeenCalledTimes(1); });
 it("rejects a changed payload under the previous idempotency key", async () => { await issue(request()); m.find.mockResolvedValue(m.create.mock.calls[0][0].data); expect((await issue(request({ ...data, amount: "500" }))).status).toBe(409); expect(m.create).toHaveBeenCalledTimes(1); });
});
describe("voucher preview is authenticated and non-mutating", () => {
 it("rejects anonymous, cross-origin and excessive requests", async () => { m.client.mockResolvedValue(null); expect((await preview(request())).status).toBe(401); m.client.mockResolvedValue({ id: "c" }); m.origin.mockReturnValue(false); expect((await preview(request())).status).toBe(403); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: false }); expect((await preview(request())).status).toBe(429); expect(m.available).not.toHaveBeenCalled(); });
 it("returns only financial preview, not recipient or issuer information", async () => { const res = await preview(request({ code: "CI-" + "A".repeat(32), startsAt: "2030-01-01" })); const result = await res.json(); expect(result.amountCents).toBe(30050); expect(Object.keys(result).sort()).toEqual(["amountCents", "terms", "validUntil"]); expect(m.create).not.toHaveBeenCalled(); expect(res.headers.get("cache-control")).toContain("no-store"); });
});
