import { describe, expect, it } from "vitest";
import { coolinkDayRange, formatCoolinkTime, localDateTimeToIso, toCoolinkDateTimeInput } from "@/lib/dateTime";

describe("CoolInk studio time", () => {
  it("stores summer appointments as an unambiguous Warsaw instant", () => {
    expect(localDateTimeToIso("2026-09-16T10:00")).toBe("2026-09-16T08:00:00.000Z");
    expect(formatCoolinkTime("2026-09-16T08:00:00.000Z")).toBe("10:00");
  });

  it("uses the winter offset automatically", () => {
    expect(localDateTimeToIso("2026-01-16T10:00")).toBe("2026-01-16T09:00:00.000Z");
  });

  it("round-trips values used by datetime-local controls", () => {
    const stored = localDateTimeToIso("2026-09-16T10:00");
    expect(toCoolinkDateTimeInput(stored)).toBe("2026-09-16T10:00");
  });

  it("builds Warsaw calendar-day boundaries", () => {
    const range = coolinkDayRange("2026-09-16T12:00:00.000Z");
    expect(range.start.toISOString()).toBe("2026-09-15T22:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-16T22:00:00.000Z");
  });
});
