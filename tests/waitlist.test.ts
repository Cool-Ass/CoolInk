import { describe, expect, it } from "vitest";
import { normalizeWaitlistDuration, normalizeWaitlistTime, normalizeWaitlistWeekdays, parseWaitlistDate, waitlistDateMatches } from "@/lib/waitlist";

describe("waitlist rules", () => {
  it("accepts an explicit unknown duration but never automatically matches it", () => {
    expect(normalizeWaitlistDuration(0)).toBe(0);
    expect(normalizeWaitlistDuration(null)).toBeNull();
    expect(normalizeWaitlistDuration("")).toBeNull();
    const entry = { earliestDate: null, latestDate: null, preferredWeekdays: "1", timePreference: "any", durationMinutes: 0 };
    expect(waitlistDateMatches(entry, new Date("2026-09-07T11:00:00Z"), new Date("2026-09-07T23:00:00Z"))).toBe(false);
  });
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

  it("defaults missing or blank weekdays without silently selecting Sunday", () => {
    for (const value of [undefined, null, "", " , ", [null, false, " "]]) expect(normalizeWaitlistWeekdays(value)).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeWaitlistWeekdays([0, "0", "2"])).toEqual([0, 2]);
  });

  it("does not accept inherited object properties as time preferences", () => {
    for (const value of ["constructor", "toString", "__proto__"]) expect(normalizeWaitlistTime(value)).toBe("any");
  });

  it("rejects nonexistent calendar dates instead of rolling into the next month", () => {
    for (const value of ["2027-02-29", "2026-02-31", "2026-04-31", "2026-13-01"]) expect(parseWaitlistDate(value)).toBeNull();
    expect(parseWaitlistDate("2028-02-29")?.toISOString()).toBe("2028-02-29T12:00:00.000Z");
  });

  it.each(["2026-03-29T00:30:00Z", "2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"])("uses Warsaw dates during the DST transition at %s", (value) => {
    const start = new Date(value);
    const date = parseWaitlistDate(value.slice(0, 10));
    expect(waitlistDateMatches({ earliestDate: date, latestDate: date, preferredWeekdays: "0", timePreference: "morning", durationMinutes: 60 }, start, new Date(+start + 60 * 60_000))).toBe(true);
  });
});
