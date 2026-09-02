import { describe, expect, it } from "vitest";
import { DEFAULT_TATTOO_STYLES, parseTattooStyles } from "../lib/tattooStyles";

describe("tattoo style configuration", () => {
  it("falls back to the backwards-compatible defaults for absent or malformed settings", () => {
    expect(parseTattooStyles()).toHaveLength(DEFAULT_TATTOO_STYLES.length);
    expect(parseTattooStyles("not-json").map((style) => style.label)).toEqual(DEFAULT_TATTOO_STYLES);
  });

  it("keeps disabled styles for history while exposing their configured order", () => {
    const styles = parseTattooStyles(JSON.stringify([
      { id: "historic", label: "Traditional", active: false, order: 2 },
      { id: "active", label: " Fine Line ", active: true, order: 1 },
    ]));
    expect(styles).toEqual([
      { id: "active", label: "Fine Line", active: true, order: 1 },
      { id: "historic", label: "Traditional", active: false, order: 2 },
    ]);
  });
});
