import { describe, expect, it } from "vitest";
import { buildVisualStyle, builderEffectClasses, parseSafeCssDeclarations } from "../lib/moduleStyle";

describe("safe module CSS declarations", () => {
  it("accepts ordinary inline CSS declarations", () => {
    expect(parseSafeCssDeclarations("color: #fff; letter-spacing: .1em; --accent: gold"))
      .toEqual({ color: "#fff", letterSpacing: ".1em", "--accent": "gold" });
  });

  it("rejects remote URLs, markup and fixed positioning", () => {
    expect(parseSafeCssDeclarations("background:url(https://tracker.test/x); color:red; position:fixed; x:</style>"))
      .toEqual({ color: "red" });
  });

  it("converts advanced controls into bounded visual styles", () => {
    const style = buildVisualStyle({
      gradientEnabled: true,
      gradientColor1: "#c99a4a",
      gradientColor2: "#090807",
      gradientAngle: 420,
      translateX: 24,
      scale: 1.2,
      opacity: 140,
      responsiveFontSize: { desktop: 72, tablet: 48, mobile: 32 },
      iconSize: { desktop: 64, tablet: 48, mobile: 28 },
    }) as Record<string, unknown>;

    expect(style.backgroundImage).toContain("linear-gradient(360deg");
    expect(style.transform).toContain("translate3d(24px");
    expect(style.opacity).toBe(1);
    expect(style["--builder-font-size-mobile"]).toBe("32px");
    expect(style["--builder-icon-size-desktop"]).toBe("64px");
  });

  it("only resizes content icons after an icon control is changed", () => {
    expect(builderEffectClasses({ color: "#fff" })).not.toContain("builder-custom-icons");
    expect(builderEffectClasses({ iconSize: { desktop: 48 } })).toContain("builder-custom-icons");
  });
});
