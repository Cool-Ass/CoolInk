import { describe, expect, it } from "vitest";
import { parseMaintenanceMode } from "../lib/maintenance";

describe("maintenance mode", () => {
  it("uses the fallback only when the database setting is absent", () => {
    expect(parseMaintenanceMode(undefined, true)).toBe(true);
    expect(parseMaintenanceMode(null, false)).toBe(false);
    expect(parseMaintenanceMode("", true)).toBe(true);
  });

  it("lets an explicit database setting override the environment fallback", () => {
    expect(parseMaintenanceMode("true", false)).toBe(true);
    expect(parseMaintenanceMode(" TRUE ", false)).toBe(true);
    expect(parseMaintenanceMode("false", true)).toBe(false);
    expect(parseMaintenanceMode("anything-else", true)).toBe(false);
  });
});

