import { describe, expect, it } from "vitest";
import { moveSection, orderedSections, parseSectionLayout } from "../lib/adminSectionLayout";

describe("admin section layout", () => {
  it("keeps saved order, appends new sections and removes unavailable ones", () => {
    expect(orderedSections(["today", "actions", "new"], ["actions", "removed", "today", "actions"])).toEqual(["actions", "today", "new"]);
  });
  it("moves sections both ways without changing the source array", () => {
    const ids = ["a", "b", "c"];
    expect(moveSection(ids, "a", "c")).toEqual(["b", "c", "a"]);
    expect(moveSection(ids, "c", "a")).toEqual(["c", "a", "b"]);
    expect(ids).toEqual(["a", "b", "c"]);
    expect(moveSection(ids, "foreign", "a")).toEqual(ids);
    expect(moveSection(ids, "a", "a")).toEqual(ids);
  });
  it("deduplicates settings and rejects invalid or oversized payloads", () => {
    expect(parseSectionLayout({ order: ["a", "a"], collapsed: [], hidden: ["b"] })).toEqual({ order: ["a"], collapsed: [], hidden: ["b"] });
    for (const input of [null, {}, { order: [], collapsed: [], hidden: ["<script>"] }, { order: Array(51).fill("a"), collapsed: [], hidden: [] }]) {
      expect(() => parseSectionLayout(input)).toThrow();
    }
  });
});
