import { describe, expect, it } from "vitest";
import { parseSafeCssDeclarations } from "../lib/moduleStyle";

describe("safe module CSS declarations", () => {
  it("accepts ordinary inline CSS declarations", () => {
    expect(parseSafeCssDeclarations("color: #fff; letter-spacing: .1em; --accent: gold"))
      .toEqual({ color: "#fff", letterSpacing: ".1em", "--accent": "gold" });
  });

  it("rejects remote URLs, markup and fixed positioning", () => {
    expect(parseSafeCssDeclarations("background:url(https://tracker.test/x); color:red; position:fixed; x:</style>"))
      .toEqual({ color: "red" });
  });
});

