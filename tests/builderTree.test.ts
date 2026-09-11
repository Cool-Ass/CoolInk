import { describe, expect, it } from "vitest";
import { findBuilderWidgetLocation, moveBuilderWidget } from "../lib/builderTree";
import { defaultModuleData, withDefaults, type ColumnWidget, type Module } from "../lib/modules";

function widget(id: string, type: "heading" | "text" = "text") {
  return { id, type, data: defaultModuleData(type) };
}

function section(id: string, columns: ColumnWidget[][]): Module {
  return {
    id,
    type: "columns",
    data: {
      ...defaultModuleData("columns"),
      layout: columns.length === 2 ? "two" : "one",
      columns,
    },
  };
}

describe("builder navigator tree operations", () => {
  it("moves a widget between root columns without mutating the source", () => {
    const modules = [section("section-a", [[widget("a")], [widget("b")]])];
    const original = JSON.stringify(modules);
    const moved = moveBuilderWidget(modules, "a", {
      moduleId: "section-a",
      ownerId: "section-a",
      columnIndex: 1,
    });

    expect(JSON.stringify(modules)).toBe(original);
    expect(withDefaults("columns", moved[0].data).columns[0]).toHaveLength(0);
    expect(withDefaults("columns", moved[0].data).columns[1].map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("moves a widget across sections into a nested column", () => {
    const inner = {
      id: "inner",
      type: "innerSection" as const,
      data: {
        ...defaultModuleData("innerSection"),
        layout: "two",
        columns: [[], [widget("nested")]],
      },
    };
    const modules = [
      section("source", [[widget("moving")]]),
      section("destination", [[inner]]),
    ];
    const moved = moveBuilderWidget(modules, "moving", {
      moduleId: "destination",
      ownerId: "inner",
      columnIndex: 0,
    });

    expect(findBuilderWidgetLocation(moved, "moving")).toMatchObject({
      moduleId: "destination",
      ownerId: "inner",
      columnIndex: 0,
      widgetIndex: 0,
    });
    expect(findBuilderWidgetLocation(moved, "nested")).toMatchObject({
      ownerId: "inner",
      columnIndex: 1,
    });
  });

  it("reorders within one column using the destination index", () => {
    const modules = [section("section-a", [[widget("a"), widget("b"), widget("c")]])];
    const moved = moveBuilderWidget(modules, "c", {
      moduleId: "section-a",
      ownerId: "section-a",
      columnIndex: 0,
      beforeIndex: 0,
    });
    expect(withDefaults("columns", moved[0].data).columns[0].map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("prevents moving an inner section into its own descendant", () => {
    const child = {
      id: "child-inner",
      type: "innerSection" as const,
      data: { ...defaultModuleData("innerSection"), columns: [[]] },
    };
    const parent = {
      id: "parent-inner",
      type: "innerSection" as const,
      data: { ...defaultModuleData("innerSection"), columns: [[child]] },
    };
    const modules = [section("section-a", [[parent]])];
    const moved = moveBuilderWidget(modules, "parent-inner", {
      moduleId: "section-a",
      ownerId: "child-inner",
      columnIndex: 0,
    });
    expect(moved).toBe(modules);
  });
});
