import { describe, expect, it } from "vitest";
import { privacyRequestDeadline } from "../lib/privacyRequestDeadline";
describe("privacy response reminder", () => {
  it("clamps month ends without counting a month as 30 days", () => {
    expect(privacyRequestDeadline(new Date("2026-01-31T12:34:56Z")).toISOString()).toBe("2026-02-28T12:34:56.000Z");
    expect(privacyRequestDeadline(new Date("2028-01-31T12:34:56Z")).toISOString()).toBe("2028-02-29T12:34:56.000Z");
    expect(privacyRequestDeadline(new Date("2026-12-15T12:34:56Z")).toISOString()).toBe("2027-01-15T12:34:56.000Z");
  });
  it("does not mutate the original receipt", () => {
    const date = new Date("2026-09-30T23:00:00Z");
    privacyRequestDeadline(date);
    expect(date.toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });
});
