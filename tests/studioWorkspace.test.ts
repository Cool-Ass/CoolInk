import { describe, expect, it } from "vitest";
import { studioWeekDays, shiftStudioDate, movedVisitRange } from "../lib/studioWeek";
import { clientNextAction } from "../lib/clientNextAction";
import { parseSectionLayout } from "../lib/adminSectionLayout";
import { projectActions, type WorkflowProject } from "../lib/studioActions";

describe("Studio workspace", () => {
  it("uses Monday weeks across year and daylight-saving boundaries", () => {
    expect(studioWeekDays("2027-01-01")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(shiftStudioDate("2026-10-25", 7)).toBe("2026-11-01");
  });
  it("moves Warsaw wall-clock time while preserving duration across DST", () => {
    const visit = { startsAt: "2026-10-23T08:00:00Z", endsAt: "2026-10-23T16:00:00Z" };
    expect(movedVisitRange(visit, "2026-10-26")).toEqual({ startsAt: "2026-10-26T09:00:00.000Z", endsAt: "2026-10-26T17:00:00.000Z" });
    expect(movedVisitRange(visit, "2026-10-26", 12).startsAt).toBe("2026-10-26T11:00:00.000Z");
  });
  it("shows only actionable client next steps, prioritizing proposed dates", () => {
    expect(clientNextAction("awaiting_client", "proposed", 2)?.destination).toBe("visit");
    expect(clientNextAction("awaiting_client", "confirmed", 2)?.destination).toBe("project");
    expect(clientNextAction("confirmed", "confirmed", 2)?.destination).toBe("documents");
    expect(clientNextAction("confirmed", "confirmed", 0)).toBeNull();
    expect(clientNextAction(undefined, "requested", 2)).toBeNull();
  });
  it("preserves old layouts and validates optional full-width sections", () => {
    const old = { order: [], collapsed: [], hidden: [] };
    expect(parseSectionLayout(old)).toEqual(old);
    expect(parseSectionLayout({ ...old, wide: ["today", "today"] }).wide).toEqual(["today"]);
    expect(() => parseSectionLayout({ ...old, wide: ["<script>"] })).toThrow();
  });
  it("defers only continuation decisions until the selected deadline", () => {
    const now = new Date("2026-10-10T08:00:00Z");
    const project: WorkflowProject = { id: "p", title: "Tattoo", description: "", kind: "tattoo", status: "awaiting_next_session", createdAt: now, updatedAt: now, nextAction: "Decide", nextActionDueAt: new Date("2026-10-11T07:00:00Z"), client: { id: "c", firstName: "A", lastName: "B" }, appointments: [{ id: "v", startsAt: new Date("2026-10-09T08:00:00Z"), status: "completed", loyaltyEntry: { id: "paid" } }] };
    expect(projectActions(project, now)).toEqual([]);
    expect(projectActions(project, new Date("2026-10-11T07:00:00Z"))[0].group).toBe("continuations");
    expect(projectActions({ ...project, appointments: [{ ...project.appointments[0], status: "requested" }] }, now)[0].group).toBe("requests");
  });
});
