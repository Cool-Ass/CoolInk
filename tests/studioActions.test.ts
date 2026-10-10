import { describe, expect, it } from "vitest";
import { projectActions, sortStudioActions, visitContext, type WorkflowProject } from "../lib/studioActions";

const now = new Date("2026-10-10T08:00:00Z");
const project: WorkflowProject = { id: "p", title: "Tatuaż", description: "Pomysł", kind: "tattoo", status: "confirmed", createdAt: now, updatedAt: now, nextAction: null, nextActionDueAt: null, client: { id: "c", firstName: "Test", lastName: "Klient" }, appointments: [] };
const visit = (id: string, date: string, status = "requested") => ({ id, startsAt: new Date(date), status, createdAt: now });
describe("studio action queue", () => {
  it("keeps each requested date and opens the matching appointment", () => {
    const actions = projectActions({ ...project, appointments: [visit("late", "2026-10-15T10:00:00Z"), visit("soon", "2026-10-11T10:00:00Z")] }, now);
    expect(sortStudioActions(actions).map(a => a.key)).toEqual(["request-soon", "request-late"]);
    expect(actions[1]).toMatchObject({ group: "requests", href: "/admin/calendar?appointment=soon", visitLabel: "Proponowany termin", receivedAt: now });
  });
  it("does not invent preparation tasks for confirmed or terminal projects", () => {
    expect(projectActions(project, now)).toEqual([]);
    expect(projectActions({ ...project, status: "completed", nextAction: "Old task" }, now)).toEqual([]);
    expect(projectActions({ ...project, status: "cancelled", nextAction: "Old task" }, now)).toEqual([]);
  });
  it("keeps explicit preparation tasks, ordered by visit rather than unrelated action deadlines", () => {
    const early = projectActions({ ...project, id: "early", nextAction: "Projekt", nextActionDueAt: new Date("2026-12-01"), appointments: [visit("a", "2026-10-11", "confirmed")] }, now)[0];
    const late = projectActions({ ...project, id: "late", nextAction: "Projekt", nextActionDueAt: new Date("2026-10-01"), appointments: [visit("b", "2026-10-20", "confirmed")] }, now)[0];
    expect(early.group).toBe("preparation");
    expect(sortStudioActions([late, early])[0]).toBe(early);
  });
  it("keeps waiting proposals separate from new requests", () => {
    expect(projectActions({ ...project, status: "date_proposed", appointments: [visit("a", "2026-10-12", "proposed")] }, now)[0].group).toBe("waiting");
  });
  it("shows continuation only after settlement, with the last completed session date", () => {
    const completed = visit("a", "2026-10-09", "completed");
    expect(projectActions({ ...project, status: "awaiting_next_session", appointments: [completed] }, now)).toEqual([]);
    expect(projectActions({ ...project, status: "awaiting_next_session", appointments: [{ ...completed, loyaltyEntry: { id: "paid" } }] }, now)[0]).toMatchObject({ group: "continuations", visitAt: completed.startsAt, visitLabel: "Ostatnia sesja" });
  });
  it("ignores past and cancelled visits when finding the next session", () => {
    expect(visitContext([visit("past", "2026-10-09", "confirmed"), visit("cancelled", "2026-10-11", "cancelled"), visit("next", "2026-10-12", "confirmed")], now)).toEqual(new Date("2026-10-12"));
  });
  it("uses the oldest unanswered message first and handles undated items deterministically", () => {
    const base = { key: "b", group: "messages" as const, priority: 2 as const, title: "", detail: "", href: "", cta: "" };
    expect(sortStudioActions([{ ...base, receivedAt: new Date("2026-10-11") }, { ...base, key: "a", receivedAt: now }]).map(a => a.key)).toEqual(["a", "b"]);
    expect(sortStudioActions([base, { ...base, key: "a" }]).map(a => a.key)).toEqual(["a", "b"]);
  });
});
