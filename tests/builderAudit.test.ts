import { describe, expect, it } from "vitest";
import { auditBuilderPage, BUILDER_PERFORMANCE_BUDGET } from "@/lib/builderAudit";
import type { Module } from "@/lib/modules";

function module(id: string, type: string, data: Record<string, unknown>, style: Record<string, unknown> = {}) {
  return { id, type, data, style } as unknown as Module;
}

describe("builder audit", () => {
  it("warns about performance budget overruns", () => {
    const modules = Array.from({ length: BUILDER_PERFORMANCE_BUDGET.maxActiveAnimations + 1 }, (_, index) =>
      module(`animated-${index}`, "spacer", {}, { animation: "fade-up", animationIteration: index < 3 ? "infinite" : "once" })
    );
    const ids = auditBuilderPage(modules).map((issue) => issue.id);
    expect(ids).toContain("animation-budget");
    expect(ids).toContain("infinite-animation-budget");
  });

  it("detects accessibility, CLS and mobile autoplay problems", () => {
    const issues = auditBuilderPage([
      module("photo", "image", { image: "/photo.webp", alt: "" }, { color: "#777777", backgroundColor: "#777777" }),
      module("cta", "button", { label: "", href: "" }),
      module("movie", "video", { autoplay: true }),
    ]);
    const ids = issues.map((issue) => issue.id);
    expect(ids).toEqual(expect.arrayContaining(["photo-contrast", "photo-alt", "photo-cls", "cta-focus", "movie-autoplay"]));
  });

  it("rejects an invalid scheduled visibility window", () => {
    const issues = auditBuilderPage([
      module("scheduled", "text", { text: "Treść" }, { visibleFrom: "2030-01-02T12:00", visibleUntil: "2030-01-01T12:00" }),
    ]);
    expect(issues.map((issue) => issue.id)).toContain("scheduled-visibility-window");
  });
});
