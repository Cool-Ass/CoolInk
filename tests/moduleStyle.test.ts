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
      responsiveWidth: { desktop: 900, tablet: 620, mobile: 320 },
      responsiveTranslateX: { desktop: 40, tablet: 16, mobile: 0 },
      iconSize: { desktop: 64, tablet: 48, mobile: 28 },
      maskImage: "/mask.svg",
    }) as Record<string, unknown>;

    expect(style.backgroundImage).toContain("linear-gradient(360deg");
    expect(style.transform).toContain("translate3d(var(--builder-translate-x");
    expect(style.opacity).toBe(1);
    expect(style["--builder-font-size-mobile"]).toBe("32px");
    expect(style["--builder-icon-size-desktop"]).toBe("64px");
    expect(style["--builder-width-tablet"]).toBe("620px");
    expect(style["--builder-translate-x-desktop"]).toBe("40px");
    expect(style.maskImage).toContain("/mask.svg");
  });

  it("creates a four-point mesh gradient", () => {
    const style = buildVisualStyle({
      gradientEnabled: true,
      gradientType: "mesh",
      gradientColor1: "#ff0000",
      gradientColor2: "#00ff00",
      gradientColor3: "#0000ff",
      gradientColor4: "#ffffff",
    });
    expect(style?.backgroundImage).toContain("radial-gradient");
    expect(String(style?.backgroundImage).match(/radial-gradient/g)).toHaveLength(4);
  });

  it("only resizes content icons after an icon control is changed", () => {
    expect(builderEffectClasses({ color: "#fff" })).not.toContain("builder-custom-icons");
    expect(builderEffectClasses({ iconSize: { desktop: 48 } })).toContain("builder-custom-icons");
  });

  it("adds independent responsive, timeline, visibility and token classes", () => {
    const classes = builderEffectClasses({
      responsiveWidth: { mobile: 320, tablet: 640, desktop: 960 },
      animation: "fade-up",
      animationTrigger: "view",
      hiddenOn: { mobile: true, tablet: false, desktop: true },
      designToken: "surface",
    });
    expect(classes).toContain("builder-responsive-layout");
    expect(classes).toContain("builder-animation-trigger-view");
    expect(classes).toContain("builder-hidden-mobile");
    expect(classes).toContain("builder-hidden-desktop");
    expect(classes).toContain("builder-token-surface");
  });
});
