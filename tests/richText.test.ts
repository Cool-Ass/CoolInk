import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "../lib/richText";

describe("rich text sanitizer", () => {
  it("preserves editor structure and safe alignment used in the client preview", () => {
    expect(sanitizeRichText('<div style="text-align: center; color: red" onclick="alert(1)"><strong>Studio</strong></div>'))
      .toBe('<p style="text-align: center"><strong>Studio</strong></p>');
  });

  it("drops dangerous markup, attributes, CSS and link protocols", () => {
    const html = sanitizeRichText('<script>alert(1)</script><p style="background:url(https://track.test); text-align:right" onmouseover="x()">Treść</p><a href="javascript:alert(1)">zły link</a>');
    expect(html).not.toMatch(/script|alert|onmouseover|javascript:|url\(/i);
    expect(html).toContain('<p style="text-align: right">Treść</p>');
    expect(html).toContain('<a>zły link</a>');
  });
});
