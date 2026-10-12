import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ access: vi.fn(), origin: vi.fn(), limit: vi.fn(), transaction: vi.fn(), lock: vi.fn(), read: vi.fn(), update: vi.fn(), sessions: vi.fn(), projectUpdate: vi.fn(), audit: vi.fn(), activity: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/bookingRules", () => ({ lockBookingCalendar: m.lock }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: m.transaction } }));
import { PATCH } from "../app/api/admin/appointments/[id]/deposit/route";
const updatedAt = new Date("2026-10-13T00:00:00Z");
function visit() { return { id: "v1", projectId: "p", updatedAt, startsAt: new Date("2026-10-20T10:00:00Z"), status: "confirmed", serviceType: "tattoo", depositStatus: "not_required", depositAmount: null, depositPaidAt: null, depositPaymentMethod: null, project: { id: "p", clientId: "c", kind: "tattoo", status: "confirmed", depositAssignedAppointmentId: null, depositStatus: "not_required", depositAmount: null, depositPaidAt: null, depositPaymentMethod: null } }; }
const body = { status: "awaiting", amount: 300, paymentMethod: "BLIK", expectedUpdatedAt: updatedAt.toISOString() };
const call = (input: object = body) => PATCH(new Request("https://coolink.test/api/admin/appointments/v1/deposit", { method: "PATCH", body: JSON.stringify(input) }), { params: Promise.resolve({ id: "v1" }) });
beforeEach(() => {
  vi.clearAllMocks();
  m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: true }); m.access.mockResolvedValue({ ok: true, admin: { id: "admin", role: "owner" } });
  m.read.mockResolvedValue(visit()); m.update.mockImplementation(async ({ data }) => ({ ...visit(), ...data })); m.sessions.mockResolvedValue([{ status: "confirmed", depositStatus: "awaiting" }]);
  m.transaction.mockImplementation(async fn => fn({ appointment: { findUnique: m.read, update: m.update, findMany: m.sessions }, tattooProject: { update: m.projectUpdate }, adminAuditLog: { create: m.audit }, projectActivity: { create: m.activity }, clientNotification: { create: m.notify } }));
});
describe("visit deposit write boundary", () => {
  it("requires finance permission and same origin before any writes", async () => {
    m.origin.mockReturnValue(false); expect((await call()).status).toBe(403); expect(m.access).not.toHaveBeenCalled();
    m.origin.mockReturnValue(true); m.access.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await call()).status).toBe(403); expect(m.access).toHaveBeenCalledWith("finance.manage"); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("enforces rate limits and strict monetary validation", async () => {
    m.limit.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429);
    m.limit.mockResolvedValue({ allowed: true }); expect((await call({ ...body, amount: "300" })).status).toBe(400); expect(m.transaction).not.toHaveBeenCalled();
  });
  it("rejects stale saves without changing payments", async () => {
    expect((await call({ ...body, expectedUpdatedAt: "old" })).status).toBe(409); expect(m.update).not.toHaveBeenCalled();
  });
  it("updates only the selected appointment and records date-specific notification and audit", async () => {
    expect((await call()).status).toBe(200);
    expect(m.lock).toHaveBeenCalled();
    expect(m.update).toHaveBeenCalledWith({ where: { id: "v1" }, data: { depositStatus: "awaiting", depositAmount: 300, depositPaymentMethod: "BLIK", depositPaidAt: null } });
    expect(m.projectUpdate).toHaveBeenCalledWith({ where: { id: "p" }, data: { status: "awaiting_deposit" } });
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ targetType: "Appointment", targetId: "v1" }) }));
    expect(m.notify.mock.calls[0][0].data.href).toContain("appointment=v1"); expect(m.notify.mock.calls[0][0].data.body).toContain("20");
  });
  it.each(["completed", "cancelled", "no_show"])("does not request a deposit for %s visits", async status => {
    m.read.mockResolvedValue({ ...visit(), status }); expect((await call()).status).toBe(409); expect(m.update).not.toHaveBeenCalled();
  });
  it("does not request a deposit for consultations or closed projects", async () => {
    const current = visit(); m.read.mockResolvedValue({ ...current, project: { ...current.project, kind: "consultation" } }); expect((await call()).status).toBe(409);
    m.read.mockResolvedValue({ ...current, project: { ...current.project, status: "completed" } }); expect((await call()).status).toBe(409);
  });
  it("preserves paid timestamp when editing a confirmed payment", async () => {
    const paidAt = new Date("2026-10-01T10:00:00Z"); m.read.mockResolvedValue({ ...visit(), depositStatus: "paid", depositAmount: 300, depositPaidAt: paidAt });
    expect((await call({ ...body, status: "paid" })).status).toBe(200); expect(m.update.mock.calls[0][0].data.depositPaidAt).toEqual(paidAt);
  });
  it("blocks duplicate requests until the old project deposit is assigned", async () => {
    const current = visit(); m.read.mockResolvedValue({ ...current, project: { ...current.project, depositStatus: "paid", depositAmount: 300 } });
    expect((await call()).status).toBe(409); expect(m.update).not.toHaveBeenCalled();
  });
  it("assigns a legacy paid deposit explicitly, preserving timestamp and original project fields", async () => {
    const current = visit(), paidAt = new Date("2026-10-01T10:00:00Z"); m.read.mockResolvedValue({ ...current, project: { ...current.project, depositStatus: "paid", depositAmount: 300, depositPaidAt: paidAt, depositPaymentMethod: "gotówka" } });
    expect((await call({ action: "assign_legacy", expectedUpdatedAt: body.expectedUpdatedAt })).status).toBe(200);
    expect(m.update.mock.calls[0][0].data).toEqual({ depositStatus: "paid", depositAmount: 300, depositPaidAt: paidAt, depositPaymentMethod: "gotówka" });
    expect(m.projectUpdate.mock.calls[0][0].data).toEqual({ depositAssignedAppointmentId: "v1" });
  });
  it("never assigns the same legacy deposit to a second session", async () => {
    const current = visit(); m.read.mockResolvedValue({ ...current, project: { ...current.project, depositAssignedAppointmentId: "v2", depositStatus: "paid", depositAmount: 300 } });
    expect((await call({ action: "assign_legacy", expectedUpdatedAt: body.expectedUpdatedAt })).status).toBe(409); expect(m.update).not.toHaveBeenCalled();
  });
});
