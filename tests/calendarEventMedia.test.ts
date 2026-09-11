import { describe, expect, it } from "vitest";
import { normalizeEventImageUrls, serializeEventImageUrls } from "../lib/calendarEventMedia";

describe("calendar event media", () => {
  it("keeps unique same-origin and HTTPS images and caps the gallery", () => {
    const urls = ["/uploads/poster.webp", "/api/media/1", "https://cdn.example/poster.jpg", "http://unsafe.test/a.jpg", "javascript:alert(1)", ...Array.from({ length: 10 }, (_, index) => `/uploads/${index}.jpg`)];
    const result = normalizeEventImageUrls(urls);
    expect(result).toHaveLength(8);
    expect(result).toEqual(expect.arrayContaining(["/uploads/poster.webp", "/api/media/1", "https://cdn.example/poster.jpg"]));
    expect(result.join(" ")).not.toMatch(/http:\/\/|javascript:/);
  });

  it("accepts persisted JSON and serializes invalid input as an empty gallery", () => {
    expect(normalizeEventImageUrls('["/uploads/a.jpg", "/uploads/a.jpg"]')).toEqual(["/uploads/a.jpg"]);
    expect(serializeEventImageUrls("not-json")).toBe("[]");
  });
});
