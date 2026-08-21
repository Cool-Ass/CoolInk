import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, slugify } from "../lib/slugify";

describe("slugify", () => {
  it("normalizuje polskie znaki, separatory i długość adresu", () => {
    expect(slugify("  Zażółć gęślą jaźń!  ")).toBe("zazolc-gesla-jazn");
    expect(slugify("A".repeat(100))).toHaveLength(80);
  });

  it("nie produkuje ścieżek zarezerwowanych dla panelu", () => {
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    expect(RESERVED_SLUGS.has("api")).toBe(true);
  });
});
