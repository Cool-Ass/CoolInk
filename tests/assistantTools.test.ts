import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ slots: vi.fn(), projects: vi.fn(), project: vi.fn(), visits: vi.fn(), count: vi.fn(), slotCount: vi.fn(), available: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { availableSlot: { findMany: m.slots, count: m.slotCount }, tattooProject: { findMany: m.projects, findFirst: m.project }, appointment: { findMany: m.visits, count: m.count } } }));
vi.mock("@/lib/appointmentAvailability", () => ({ verifyExplicitAppointmentAvailability: m.available }));
import { assistantInput, assistantFreeDates, runAssistantTool } from "@/lib/assistantTools";
beforeEach(() => { vi.resetAllMocks(); m.slots.mockResolvedValue([]); m.available.mockResolvedValue({ ok: true }); m.projects.mockResolvedValue([]); m.visits.mockResolvedValue([]); m.count.mockResolvedValue(3); m.slotCount.mockResolvedValue(2); });
describe("assistant safe tool boundary", () => {
  it.each([{ tool: "sql" }, { tool: "free_dates", days: 32 }, { tool: "free_dates", durationMinutes: 31 }, { tool: "projects", query: "a".repeat(121) }])("rejects unbounded or unknown input %j", input => expect(() => assistantInput(input)).toThrow());
  it("denies financial results before any query for non-finance roles", async () => { await expect(runAssistantTool("artist", { tool: "unsettled" })).rejects.toMatchObject({ status: 403 }); expect(m.visits).not.toHaveBeenCalled(); });
  it("denies promotions to non-content staff", async () => { await expect(runAssistantTool("receptionist", { tool: "promotion_draft" })).rejects.toMatchObject({ status: 403 }); expect(m.slots).not.toHaveBeenCalled(); });
  it("uses the canonical buffer/Google/availability gate and skips conflicts", async () => {
    const now = new Date("2026-10-13T08:01:00Z"), until = new Date("2026-10-14T08:00:00Z");
    m.slots.mockResolvedValue([{ startsAt: new Date("2026-10-13T09:00:00Z"), endsAt: new Date("2026-10-13T12:00:00Z") }]); m.available.mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true });
    const result = await assistantFreeDates(now, until, 60); expect(result.dates).toHaveLength(1); expect(result.dates[0].startsAt).toBe("2026-10-13T09:30:00.000Z"); expect(m.available).toHaveBeenCalledTimes(2);
  });
  it("bounds candidate scans and marks partial results", async () => { m.slots.mockResolvedValue([{ startsAt: new Date("2026-10-13T09:00:00Z"), endsAt: new Date("2026-11-13T12:00:00Z") }]); m.available.mockResolvedValue({ ok: false }); expect((await assistantFreeDates(new Date("2026-10-13"), new Date("2026-11-13"), 60)).partial).toBe(true); expect(m.available).toHaveBeenCalledTimes(96); });
  it("does not expose contacts or private images in project search", async () => { await runAssistantTool("artist", { tool: "projects", query: "tattoo" }); const query = m.projects.mock.calls[0][0]; expect(query.select).toEqual({ id: true, clientId: true, title: true, status: true }); expect(query.where.client.deletionRequest).toEqual({ is: null }); });
  it("draft generation never writes or sends messages", async () => { m.project.mockResolvedValue({ id: "p", title: "Tatuaż", appointments: [] }); const result = await runAssistantTool("artist", { tool: "message_draft", projectId: "p" }); expect(result).toMatchObject({ projectId: "p", draft: expect.stringContaining("Tatuaż") }); });
});
