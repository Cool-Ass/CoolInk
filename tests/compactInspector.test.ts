import { describe, expect, it } from "vitest";
import { inspectorLayout } from "@/lib/inspectorLayout";
import { constrainGuide, duplicateGuide, guideLine } from "@/lib/canvasGuides";
import { newestSessionsFirst } from "@/lib/appointmentPresentation";

describe("compact inspector and guides", () => {
  it("keeps popovers within narrow and short viewports", () => {
    for (const viewport of [{ width: 390, height: 600 }, { width: 280, height: 320 }, { width: 1440, height: 900 }]) {
      const result = inspectorLayout({ left: 160, right: 230, top: viewport.height - 70, bottom: viewport.height - 38 }, viewport, 800);
      expect(result.left).toBeGreaterThanOrEqual(12);
      expect(result.left + result.width).toBeLessThanOrEqual(viewport.width - 12);
      expect(result.top).toBeGreaterThanOrEqual(12);
      expect(result.top + result.maxHeight).toBeLessThanOrEqual(viewport.height - 12);
    }
  });
  it("positions above a trigger near the bottom", () => {
    expect(inspectorLayout({ left: 230, right: 262, top: 510, bottom: 542 }, { width: 390, height: 600 }, 400).top).toBeLessThan(510);
  });
  it("clamps coordinates and normalizes rotations without corrupting guide identity", () => {
    expect(constrainGuide({ id: 1, x: -3, y: 999, angle: -90 }, { width: 390, height: 500 })).toEqual({ id: 1, x: 0, y: 500, angle: 270 });
    expect(constrainGuide({ id: 1, x: NaN, y: Infinity, angle: NaN }, { width: 390, height: 500 })).toEqual({ id: 1, x: 0, y: 0, angle: 0 });
  });
  it("duplicates with a new identity and visible offset even at canvas edges", () => {
    const guide = { id: 1, x: 390, y: 500, angle: 35 };
    expect(duplicateGuide(guide, 2, { width: 390, height: 500 })).toEqual({ id: 2, x: 374, y: 484, angle: 35 });
    expect(guide.x).toBe(390);
  });
  it("keeps horizontal and vertical line anchors at their pixel position", () => {
    const horizontal = guideLine({ id: 1, x: 200, y: 300, angle: 0 }, { width: 600, height: 900 });
    expect(horizontal.y1).toBe(300); expect(horizontal.y2).toBe(300);
    const vertical = guideLine({ id: 1, x: 200, y: 300, angle: 90 }, { width: 600, height: 900 });
    expect(vertical.x1).toBeCloseTo(200); expect(vertical.x2).toBeCloseTo(200);
  });
  it("sorts newer visits first without modifying the source, with stable equal-date ordering", () => {
    const sessions = [{ id: "old", startsAt: new Date("2026-10-01T08:00Z") }, { id: "new", startsAt: new Date("2026-10-06T08:00Z") }];
    expect(newestSessionsFirst(sessions).map((item) => item.id)).toEqual(["new", "old"]);
    expect(sessions[0].id).toBe("old");
    expect(newestSessionsFirst([{ id: "z", startsAt: "2026-10-01" }, { id: "a", startsAt: "2026-10-01" }])[0].id).toBe("a");
  });
});
