import { describe, expect, it } from "vitest";
import { calendarDayStatus, effectiveWorkingHours, isHexColor, isOperationalCalendarAppointment, localDateKey, mergeSelectedDates, resolveAvailableRanges, runAtomicBulk, selectedDateRange } from "../lib/calendarHub";
import { isValidIconName } from "../lib/icons";

describe("Calendar Hub selection", () => {
  it("keeps cancelled appointments in history but excludes them from the operational calendar", () => {
    expect(isOperationalCalendarAppointment("confirmed")).toBe(true);
    expect(isOperationalCalendarAppointment("proposed")).toBe(true);
    expect(isOperationalCalendarAppointment("completed")).toBe(true);
    expect(isOperationalCalendarAppointment("no_show")).toBe(true);
    expect(isOperationalCalendarAppointment("cancelled")).toBe(false);
  });
  it("creates an inclusive multi-day range", () => {
    expect(selectedDateRange(new Date(2026, 7, 10), new Date(2026, 7, 12)).map(localDateKey)).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });

  it("adds and removes single days without duplicating them", () => {
    const first = new Date(2026, 7, 10);
    const second = new Date(2026, 7, 12);
    expect(mergeSelectedDates([first], second, { additive: true }).map(localDateKey)).toEqual(["2026-08-10", "2026-08-12"]);
    expect(mergeSelectedDates([first, second], first, { additive: true }).map(localDateKey)).toEqual(["2026-08-12"]);
  });

  it("accepts safe calendar colors and rejects arbitrary values", () => {
    expect(isHexColor("#C99A4A")).toBe(true);
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("url(javascript:alert(1))")).toBe(false);
  });

  it("gives a date-specific override precedence over recurring hours", () => {
    const date = new Date(2026, 7, 26);
    expect(effectiveWorkingHours(date, [{ weekday: 3, enabled: true, startsAt: "10:00", endsAt: "18:00" }], [{ date, enabled: false, startsAt: "00:00", endsAt: "00:00", note: "Urlop" }])).toMatchObject({ enabled: false, source: "override" });
  });

  it("stores only identifiers from the shared icon registry", () => {
    expect(isValidIconName("sparkles")).toBe(true);
    expect(isValidIconName("<svg onload=alert(1)>")).toBe(false);
  });

  it("lets an explicit slot extend a closed recurring day, but not a hard day-off", () => {
    const date = new Date(2026, 7, 26, 0, 0);
    const slot = { startsAt: new Date(2026, 7, 26, 10), endsAt: new Date(2026, 7, 26, 12), isPublic: true };
    const input = { date, recurring: [{ weekday: 3, enabled: false, startsAt: "10:00", endsAt: "18:00" }], overrides: [], slots: [slot], appointments: [], bufferMinutes: 30, publicOnly: true };
    expect(resolveAvailableRanges({ ...input, blocks: [] })).toHaveLength(1);
    expect(resolveAvailableRanges({ ...input, blocks: [{ startsAt: new Date(2026, 7, 26), endsAt: new Date(2026, 7, 27) }] })).toEqual([]);
  });

  it("subtracts an appointment and its buffer from an explicit available slot", () => {
    const date = new Date(2026, 7, 26);
    const ranges = resolveAvailableRanges({ date, recurring: [], overrides: [], slots: [{ startsAt: new Date(2026, 7, 26, 10), endsAt: new Date(2026, 7, 26, 18), isPublic: true }], blocks: [], appointments: [{ startsAt: new Date(2026, 7, 26, 12), endsAt: new Date(2026, 7, 26, 14), status: "confirmed" }], bufferMinutes: 30, publicOnly: true });
    expect(ranges.map((range) => [range.startsAt.getHours(), range.startsAt.getMinutes(), range.endsAt.getHours(), range.endsAt.getMinutes()])).toEqual([[10, 0, 11, 30], [14, 30, 18, 0]]);
  });

  it("hides private slots from the client resolver while retaining them for an administrator", () => {
    const date = new Date(2026, 7, 26);
    const slots = [
      { startsAt: new Date(2026, 7, 26, 10), endsAt: new Date(2026, 7, 26, 11), isPublic: true },
      { startsAt: new Date(2026, 7, 26, 12), endsAt: new Date(2026, 7, 26, 13), isPublic: false },
    ];
    const input = { date, recurring: [], overrides: [], slots, blocks: [], appointments: [], bufferMinutes: 0 };
    expect(resolveAvailableRanges({ ...input, publicOnly: true })).toHaveLength(1);
    expect(resolveAvailableRanges({ ...input, publicOnly: false })).toHaveLength(2);
  });

  it("keeps a default weekday gray and not bookable", () => {
    const date = new Date(2026, 7, 26);
    expect(calendarDayStatus(date, [], [])).toBe("default");
    expect(resolveAvailableRanges({ date, recurring: [], overrides: [], slots: [], blocks: [], appointments: [], bufferMinutes: 0, publicOnly: true })).toEqual([]);
  });

  it("never turns working hours into public availability", () => {
    const date = new Date(2026, 7, 26); // Wednesday
    const ranges = resolveAvailableRanges({ date, recurring: [{ weekday: 3, enabled: true, startsAt: "10:00", endsAt: "18:00" }], overrides: [], slots: [], blocks: [], appointments: [], bufferMinutes: 0, publicOnly: true });
    expect(calendarDayStatus(date, [], [])).toBe("default");
    expect(ranges).toEqual([]);
  });

  it("uses explicit availability as a green, client-visible range", () => {
    const date = new Date(2026, 7, 26);
    const slots = [{ startsAt: new Date(2026, 7, 26, 10), endsAt: new Date(2026, 7, 26, 18), isPublic: true }];
    expect(calendarDayStatus(date, slots, [])).toBe("available");
    expect(resolveAvailableRanges({ date, recurring: [], overrides: [], slots, blocks: [], appointments: [], bufferMinutes: 0, publicOnly: true }).map((range) => [range.startsAt.getHours(), range.endsAt.getHours()])).toEqual([[10, 18]]);
  });

  it("keeps Sunday red by default, permits an explicit available override, and restores red after clear", () => {
    const sunday = new Date(2026, 7, 30);
    const slot = { startsAt: new Date(2026, 7, 30, 11), endsAt: new Date(2026, 7, 30, 18), isPublic: true };
    expect(calendarDayStatus(sunday, [], [])).toBe("unavailable");
    expect(calendarDayStatus(sunday, [slot], [])).toBe("available");
    expect(calendarDayStatus(sunday, [], [])).toBe("unavailable");
  });

  it("lets an explicit unavailable state override a weekday", () => {
    const date = new Date(2026, 7, 26);
    expect(calendarDayStatus(date, [], [{ startsAt: new Date(2026, 7, 26), endsAt: new Date(2026, 7, 27) }])).toBe("unavailable");
  });

  it("keeps bulk operations atomic when a member fails", async () => {
    const persisted: string[] = [];
    await expect(runAtomicBulk(async (work) => { const snapshot = [...persisted]; try { return await work(); } catch (error) { persisted.splice(0, persisted.length, ...snapshot); throw error; } }, [async () => { persisted.push("one"); return "one"; }, async () => { persisted.push("two"); return "two"; }, async () => { throw new Error("invalid third record"); }])).rejects.toThrow("invalid third record");
    expect(persisted).toEqual([]);
  });
});
