import { describe, expect, it } from "vitest";
import { cloneBuilderModule, createHeroStarter, withDefaults } from "@/lib/modules";
import { findBuilderWidgetLocation, moveBuilderWidget } from "@/lib/builderTree";

describe("freeform hero starter", () => {
  it("persists as existing columns with independently editable widgets and no stock photo", () => {
    const hero = createHeroStarter();
    expect(hero.type).toBe("columns");
    const data = withDefaults("columns", hero.data);
    expect(data.columns).toHaveLength(2);
    expect(data.columns[0].map((widget) => widget.type)).toEqual(["text", "heading", "text", "innerSection"]);
    expect(data.columns[1][0].data.image).toBe("");
    expect(data.columns[0][1].data.level).toBe("h1");
    expect(hero.style?.anchorId).toBe("hero");
    expect(JSON.parse(JSON.stringify(hero))).toEqual(hero);
  });

  it("has fresh IDs on each insertion and cloning preserves the editable tree", () => {
    const a = createHeroStarter();
    const b = createHeroStarter();
    const clone = cloneBuilderModule(a);
    expect(a.id).not.toBe(b.id);
    expect(clone.id).not.toBe(a.id);
    expect(withDefaults("columns", clone.data).columns[0][1].id).not.toBe(withDefaults("columns", a.data).columns[0][1].id);
  });

  it("allows a CTA to move from its nested action row to another hero column", () => {
    const hero = createHeroStarter();
    const row = withDefaults("columns", hero.data).columns[0][3];
    const cta = withDefaults("innerSection", row.data).columns[0][0];
    expect(findBuilderWidgetLocation([hero], cta.id)?.ownerId).toBe(row.id);
    const moved = moveBuilderWidget([hero], cta.id, { moduleId: hero.id, ownerId: hero.id, columnIndex: 1 });
    expect(findBuilderWidgetLocation(moved, cta.id)?.columnIndex).toBe(1);
    expect(withDefaults("innerSection", row.data).columns[0]).toHaveLength(1);
  });
});
