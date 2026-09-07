import { describe, expect, it } from "vitest";
import { normalizeWaitlistDuration, normalizeWaitlistTime, normalizeWaitlistWeekdays, waitlistDateMatches } from "@/lib/waitlist";

describe("waitlist rules", () => {
  it("normalizes preferences without accepting invalid values", () => {
    expect(normalizeWaitlistWeekdays([5, 1, 1, 9])).toEqual([1, 5]);
    expect(normalizeWaitlistWeekdays([])).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeWaitlistDuration(120)).toBe(120);
    expect(normalizeWaitlistDuration(45)).toBeNull();
    expect(normalizeWaitlistTime("evening")).toBe("evening");
    expect(normalizeWaitlistTime("night")).toBe("any");
  });

  it("matches date, weekday, duration and time preference", () => {
    const entry = { earliestDate: null, latestDate: null, preferredWeekdays: "1,3", timePreference: "afternoon", durationMinutes: 120 };
    expect(waitlistDateMatches(entry, new Date("2026-09-07T11:00:00Z"), new Date("2026-09-07T13:00:00Z"))).toBe(true);
    expect(waitlistDateMatches(entry, new Date("2026-09-08T11:00:00Z"), new Date("2026-09-08T13:00:00Z"))).toBe(false);
    expect(waitlistDateMatches(entry, new Date("2026-09-07T08:00:00Z"), new Date("2026-09-07T10:00:00Z"))).toBe(false);
    expect(waitlistDateMatches(entry, new Date("2026-09-07T11:00:00Z"), new Date("2026-09-07T12:00:00Z"))).toBe(false);
  });
});
