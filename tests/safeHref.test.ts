import { describe, expect, it } from "vitest";
import { safeHref, safeMapEmbedUrl } from "@/lib/safeHref";

describe("safeHref", () => {
  it("allows local, secure web and contact links", () => {
    expect(safeHref("/#kalendarz")).toBe("/#kalendarz");
    expect(safeHref("https://instagram.com/coolink.tattoo.studio")).toBe("https://instagram.com/coolink.tattoo.studio");
    expect(safeHref("mailto:kontakt@coolinktattoo.pl")).toBe("mailto:kontakt@coolinktattoo.pl");
  });
  it("blocks executable and protocol-relative URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,test")).toBe("#");
    expect(safeHref("//attacker.example/path")).toBe("#");
  });
  it("allows only Google Maps embed URLs", () => {
    expect(safeMapEmbedUrl("https://www.google.com/maps/embed?pb=test")).toContain("google.com/maps/embed");
    expect(safeMapEmbedUrl("https://attacker.example/maps/embed")).toBe("");
  });
});
