import { describe, expect, it } from "vitest";
import { normalizeLeadSource } from "@/lib/leadSource";

describe("lead source", () => {
  it("accepts known attribution channels only", () => {
    expect(normalizeLeadSource(" Instagram ")).toBe("instagram");
    expect(normalizeLeadSource("javascript:alert(1)")).toBeNull();
    expect(normalizeLeadSource("")).toBeNull();
  });
});
