import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  origin: vi.fn(), client: vi.fn(), access: vi.fn(), lock: vi.fn(), availability: vi.fn(), conflict: vi.fn(),
  outsideEntry: vi.fn(), insideEntry: vi.fn(), outsideProject: vi.fn(), insideProject: vi.fn(),
  outsideVisit: vi.fn(), insideVisit: vi.fn(), candidates: vi.fn(),
  create: vi.fn(), visitUpdate: vi.fn(), visitUpdateMany: vi.fn(), entryUpdate: vi.fn(), entryUpdateMany: vi.fn(), upsert: vi.fn(),
  projectUpdate: vi.fn(), activity: vi.fn(), notification: vi.fn(), push: vi.fn(), sync: vi.fn(), audit: vi.fn(), event: vi.fn(),
}));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: m.access }));
vi.mock("@/lib/adminAudit", () => ({ writeAdminAudit: m.audit }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: async () => ({ allowed: true }), setRateLimitHeaders: (r: Response) => r }));
vi.mock("@/lib/bookingRules", async (original) => ({ ...await original<typeof import("@/lib/bookingRules")>(), lockBookingCalendar: m.lock, bookingConflict: m.conflict }));
vi.mock("@/lib/appointmentAvailability", () => ({ verifyExplicitAppointmentAvailability: m.availability }));
vi.mock("@/lib/webPush", () => ({ sendPushToClient: m.push, sendPushToAdmins: m.push }));
vi.mock("@/lib/googleCalendarSyncEngine", () => ({ syncAppointmentToGoogle: m.sync, retryGoogleCalendarExports: vi.fn(), refreshGoogleBusyCalendars: async () => ({ failed: 0 }), recordGoogleSyncOutcome: vi.fn() }));
vi.mock("@/lib/workflowEvents", () => ({ recordWorkflowEvent: m.event }));
vi.mock("@/lib/operationalJob", () => ({ operationalJob: (run: () => unknown) => run() }));
vi.mock("@/lib/dataRetention", () => ({ applyOperationalDataRetention: async () => ({}) }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  waitlistEntry: { findUnique: m.outsideEntry, findFirst: m.outsideEntry, findMany: m.candidates },
  tattooProject: { findFirst: m.outsideProject }, appointment: { findFirst: m.outsideVisit, findMany: async () => [] },
  $transaction: (run: (tx: unknown) => unknown) => run({
    waitlistEntry: { findUnique: m.insideEntry, findFirst: m.insideEntry, update: m.entryUpdate, updateMany: m.entryUpdateMany, upsert: m.upsert },
    tattooProject: { findFirst: m.insideProject, update: m.projectUpdate },
    appointment: { create: m.create, findUnique: m.insideVisit, findFirst: m.insideVisit, findMany: async () => [{ status: "confirmed", depositStatus: "not_required" }], update: m.visitUpdate, updateMany: m.visitUpdateMany },
    projectActivity: { create: m.activity }, clientNotification: { create: m.notification },
  }),
} }));
import { POST as offer } from "../app/api/admin/waitlist/[id]/offer/route";
import { PATCH as changeStatus } from "../app/api/admin/waitlist/[id]/route";
import { POST as join, DELETE as leave } from "../app/api/client/waitlist/route";
import { POST as respond } from "../app/api/client/appointments/[id]/response/route";
import { offerReleasedRange } from "../lib/waitlistAutomation";
import { GET as reminders } from "../app/api/cron/reminders/route";

const startsAt = new Date("2027-01-04T10:00:00Z");
const endsAt = new Date("2027-01-04T12:00:00Z");
const project = { id: "project", clientId: "client", title: "Projekt", kind: "tattoo", status: "awaiting_client", clientArchivedAt: null };
const visit = { id: "visit", projectId: "project", startsAt, endsAt, status: "proposed", serviceType: "tattoo", workstation: "A", depositStatus: "not_required" };
const entry = { id: "entry", projectId: "project", clientId: "client", status: "active", durationMinutes: 120, preferredWeekdays: "1", timePreference: "any", earliestDate: null, latestDate: null, project, offeredAppointmentId: "visit", offeredAppointment: visit, offerExpiresAt: new Date("2026-10-14T10:00:00Z") };
const params = { params: Promise.resolve({ id: "entry" }) };
const request = (body: unknown, method = "POST") => new Request("https://coolink.test/api/waitlist", { method, body: JSON.stringify(body) });
const offerRequest = () => request({ startsAt: startsAt.toISOString(), durationMinutes: 120 });
const response = () => respond(request({ response: "accept" }), { params: Promise.resolve({ id: "visit" }) });

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-13T10:00:00Z"));
  m.origin.mockReturnValue(true); m.client.mockResolvedValue({ id: "client" }); m.access.mockResolvedValue({ ok: true, admin: { id: "admin" } });
  m.outsideEntry.mockResolvedValue(entry); m.insideEntry.mockResolvedValue(entry);
  m.outsideProject.mockResolvedValue(project); m.insideProject.mockResolvedValue(project);
  m.outsideVisit.mockResolvedValue({ ...visit, project, waitlistOffer: { ...entry, status: "offered" } });
  m.insideVisit.mockResolvedValue({ ...visit, project, waitlistOffer: { ...entry, status: "offered" } });
  m.create.mockResolvedValue(visit); m.visitUpdate.mockResolvedValue({ ...visit, status: "confirmed" });
  m.visitUpdateMany.mockResolvedValue({ count: 1 }); m.entryUpdateMany.mockResolvedValue({ count: 1 }); m.upsert.mockResolvedValue(entry);
  m.availability.mockResolvedValue({ ok: true }); m.conflict.mockResolvedValue({}); m.push.mockResolvedValue({}); m.sync.mockResolvedValue(undefined);
  m.candidates.mockResolvedValue([entry]); vi.stubEnv("CRON_SECRET", "fixture");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("waitlist transactions use current state after the calendar lock", () => {
  it("rejects a second manual offer even if its initial read saw active", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, status: "offered" });
    expect((await offer(offerRequest(), params)).status).toBe(409);
    expect(m.create).not.toHaveBeenCalled(); expect(m.push).not.toHaveBeenCalled();
  });
  it.each(["cancelled", "completed"])("does not offer a %s project", async (status) => {
    m.insideEntry.mockResolvedValue({ ...entry, project: { ...project, status } });
    expect((await offer(offerRequest(), params)).status).toBe(409); expect(m.create).not.toHaveBeenCalled();
  });
  it("does not offer an archived project", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, project: { ...project, clientArchivedAt: new Date() } });
    expect((await offer(offerRequest(), params)).status).toBe(409); expect(m.create).not.toHaveBeenCalled();
  });
  it("creates one manual offer with tattoo buffer context and audit", async () => {
    expect((await offer(offerRequest(), params)).status).toBe(201);
    expect(m.availability).toHaveBeenCalledWith(startsAt, endsAt, undefined, expect.anything(), { serviceType: "tattoo" });
    expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.insideEntry.mock.invocationCallOrder[0]);
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ serviceType: "tattoo" }) }));
    expect(m.audit).toHaveBeenCalledOnce(); expect(m.sync).toHaveBeenCalledWith("visit");
  });
  it("does not join over an offer sent while waiting for the lock", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, status: "offered" });
    expect((await join(request({ projectId: "project", durationMinutes: 120 }))).status).toBe(409);
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it("rechecks project ownership and archive during join", async () => {
    m.insideProject.mockResolvedValue(null);
    expect((await join(request({ projectId: "project", durationMinutes: 120 }))).status).toBe(404);
    expect(m.upsert).not.toHaveBeenCalled();
    expect(m.insideProject).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ clientId: "client", clientArchivedAt: null }) }));
  });
  it.each(["confirmed", "completed"])("client leaving never cancels a now %s appointment", async (status) => {
    m.insideEntry.mockResolvedValue({ ...entry, status: "booked", offeredAppointment: { ...visit, status } });
    expect((await leave(request({ id: "entry" }, "DELETE"))).status).toBe(200);
    expect(m.visitUpdate).not.toHaveBeenCalled(); expect(m.visitUpdateMany).not.toHaveBeenCalled();
    expect(m.sync).not.toHaveBeenCalled();
  });
  it("leaving cancels and synchronizes only a still proposed appointment", async () => {
    expect((await leave(request({ id: "entry" }, "DELETE"))).status).toBe(200);
    expect(m.visitUpdateMany).toHaveBeenCalledWith({ where: { id: "visit", status: "proposed" }, data: { status: "cancelled" } });
    expect(m.sync).toHaveBeenCalledWith("visit");
  });
  it("client leaving rechecks ownership under the lock", async () => {
    m.insideEntry.mockResolvedValue(null);
    expect((await leave(request({ id: "entry" }, "DELETE"))).status).toBe(404);
    expect(m.entryUpdate).not.toHaveBeenCalled();
    expect(m.insideEntry).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "entry", clientId: "client" } }));
  });
  it("admin status change preserves a concurrently accepted appointment", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, status: "booked", offeredAppointment: { ...visit, status: "confirmed" } });
    expect((await changeStatus(request({ status: "closed" }, "PATCH"), params)).status).toBe(200);
    expect(m.visitUpdate).not.toHaveBeenCalled(); expect(m.visitUpdateMany).not.toHaveBeenCalled();
  });
  it("rejects acceptance if the offer expires while waiting for the lock", async () => {
    m.insideVisit.mockResolvedValue({ ...visit, waitlistOffer: { ...entry, status: "offered", offerExpiresAt: new Date("2026-10-13T09:59:59Z") } });
    expect((await response()).status).toBe(409); expect(m.visitUpdate).not.toHaveBeenCalled();
  });
  it("rejects a waitlist link that is no longer offered", async () => {
    m.insideVisit.mockResolvedValue({ ...visit, waitlistOffer: { ...entry, status: "active" } });
    expect((await response()).status).toBe(409); expect(m.visitUpdate).not.toHaveBeenCalled();
  });
  it("uses the current service and workstation when accepting", async () => {
    expect((await response()).status).toBe(200);
    expect(m.conflict).toHaveBeenCalledWith(startsAt, endsAt, "visit", true, expect.anything(), { serviceType: "tattoo", workstation: "A" });
    expect(m.insideVisit).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ project: expect.objectContaining({ clientId: "client", clientArchivedAt: null }) }) }));
  });
  it("cannot accept a proposal after its start time", async () => {
    m.insideVisit.mockResolvedValue({ ...visit, startsAt: new Date("2026-10-13T09:00:00Z"), waitlistOffer: null });
    expect((await response()).status).toBe(409); expect(m.visitUpdate).not.toHaveBeenCalled();
  });
});

describe("released ranges", () => {
  it("uses the shared explicit availability gate", async () => {
    m.availability.mockResolvedValue({ ok: false });
    expect(await offerReleasedRange(startsAt, endsAt)).toBeNull(); expect(m.create).not.toHaveBeenCalled();
  });
  it("checks preferences again after acquiring the lock", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, preferredWeekdays: "2" });
    expect(await offerReleasedRange(startsAt, endsAt)).toBeNull(); expect(m.create).not.toHaveBeenCalled();
  });
  it("uses a changed duration from the current entry", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, durationMinutes: 60 });
    expect(await offerReleasedRange(startsAt, endsAt)).toEqual({ appointmentId: "visit", waitlistEntryId: "entry" });
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ endsAt: new Date("2027-01-04T11:00:00Z") }) }));
  });
  it("does not revive an archived project", async () => {
    m.insideEntry.mockResolvedValue({ ...entry, project: { ...project, clientArchivedAt: new Date() } });
    expect(await offerReleasedRange(startsAt, endsAt)).toBeNull(); expect(m.create).not.toHaveBeenCalled();
  });
  it("does not offer a range already in progress", async () => {
    expect(await offerReleasedRange(new Date("2026-10-13T09:30:00Z"), new Date("2026-10-13T11:30:00Z"))).toBeNull();
    expect(m.create).not.toHaveBeenCalled();
  });
  it("expires only the exact offer observed by the cron scan", async () => {
    m.candidates.mockResolvedValue([{ ...entry, status: "offered", offerExpiresAt: new Date("2026-10-13T09:00:00Z") }]);
    m.insideEntry.mockResolvedValue({ ...entry, status: "offered", offeredAppointmentId: "new-visit", offerExpiresAt: new Date("2026-10-14T10:00:00Z") });
    const result = await reminders(new Request("https://coolink.test/api/cron/reminders", { headers: { authorization: "Bearer fixture" } }));
    expect((await result.json()).expiredWaitlistOffers).toBe(0);
    expect(m.entryUpdateMany).not.toHaveBeenCalled(); expect(m.visitUpdateMany).not.toHaveBeenCalled();
  });

  it("expires an unchanged proposal, preserves confirmed sibling sessions and syncs its cancellation", async () => {
    const expired = { ...entry, status: "offered", offerExpiresAt: new Date("2026-10-13T09:00:00Z") };
    m.candidates.mockResolvedValue([expired]); m.insideEntry.mockResolvedValue(expired);
    const result = await reminders(new Request("https://coolink.test/api/cron/reminders", { headers: { authorization: "Bearer fixture" } }));
    expect((await result.json()).expiredWaitlistOffers).toBe(1);
    expect(m.projectUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "confirmed" }) }));
    expect(m.sync).toHaveBeenCalledWith("visit");
    expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.insideEntry.mock.invocationCallOrder[0]);
    expect(m.entryUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ offeredAppointmentId: "visit" }) }));
  });

  it("never expires an already accepted appointment", async () => {
    m.candidates.mockResolvedValue([{ ...entry, status: "offered", offerExpiresAt: new Date("2026-10-13T09:00:00Z") }]);
    m.insideEntry.mockResolvedValue({ ...entry, status: "booked" });
    await reminders(new Request("https://coolink.test/api/cron/reminders", { headers: { authorization: "Bearer fixture" } }));
    expect(m.entryUpdateMany).not.toHaveBeenCalled(); expect(m.visitUpdateMany).not.toHaveBeenCalled();
  });

  it("reconciles a studio-confirmed offer without cancelling or reopening it", async () => {
    const expired = { ...entry, status: "offered", offerExpiresAt: new Date("2026-10-13T09:00:00Z"), offeredAppointment: { ...visit, status: "confirmed" } };
    m.candidates.mockResolvedValue([expired]); m.insideEntry.mockResolvedValue(expired);
    await reminders(new Request("https://coolink.test/api/cron/reminders", { headers: { authorization: "Bearer fixture" } }));
    expect(m.entryUpdate).toHaveBeenCalledWith({ where: { id: "entry" }, data: { status: "booked" } });
    expect(m.visitUpdateMany).not.toHaveBeenCalled(); expect(m.projectUpdate).not.toHaveBeenCalled(); expect(m.notification).not.toHaveBeenCalled();
  });

  it("returns an already cancelled studio offer to the active list", async () => {
    const expired = { ...entry, status: "offered", offerExpiresAt: new Date("2026-10-13T09:00:00Z"), offeredAppointment: { ...visit, status: "cancelled" } };
    m.candidates.mockResolvedValueOnce([expired]).mockResolvedValue([]); m.insideEntry.mockResolvedValue(expired);
    const result = await reminders(new Request("https://coolink.test/api/cron/reminders", { headers: { authorization: "Bearer fixture" } }));
    expect((await result.json()).expiredWaitlistOffers).toBe(1);
    expect(m.entryUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "active", offeredAppointmentId: null }) }));
  });
});

describe("waitlist access boundaries", () => {
  it("rejects foreign origin before reads", async () => {
    m.origin.mockReturnValue(false);
    expect((await offer(offerRequest(), params)).status).toBe(403);
    expect((await join(request({}))).status).toBe(403);
    expect((await leave(request({}, "DELETE"))).status).toBe(403);
    expect((await changeStatus(request({}, "PATCH"), params)).status).toBe(403);
    expect((await response()).status).toBe(403); expect(m.lock).not.toHaveBeenCalled();
  });
  it("requires operations permission", async () => {
    m.access.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await offer(offerRequest(), params)).status).toBe(403);
    expect((await changeStatus(request({}, "PATCH"), params)).status).toBe(403);
    expect(m.access).toHaveBeenCalledWith("operations.manage"); expect(m.lock).not.toHaveBeenCalled();
  });
  it("requires a client session", async () => {
    m.client.mockResolvedValue(null);
    expect((await join(request({}))).status).toBe(401);
    expect((await leave(request({}, "DELETE"))).status).toBe(401);
    expect((await response()).status).toBe(401); expect(m.lock).not.toHaveBeenCalled();
  });
});
