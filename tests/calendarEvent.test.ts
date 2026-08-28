import { describe, expect, it } from "vitest";
import { googleCalendarUrl } from "../lib/calendarEvent";

describe("Google Calendar link", () => {
  it("uses Warsaw local time during CEST, encodes neutral event data and includes location", () => {
    const url = new URL(googleCalendarUrl({ startsAt: new Date("2026-03-29T08:00:00.000Z"), endsAt: new Date("2026-03-29T09:30:00.000Z") }));
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260329T100000/20260329T113000");
    expect(url.searchParams.get("ctz")).toBe("Europe/Warsaw");
    expect(url.searchParams.get("text")).toBe("Wizyta — CoolInk Tattoo Studio");
    expect(url.searchParams.get("location")).toContain("Aleja Konstytucji 3 Maja 10");
    expect(url.searchParams.get("details")).toBe("Wizyta w CoolInk Tattoo Studio. Szczegóły wizyty znajdziesz na swoim koncie klienta.");
    expect(url.toString()).not.toMatch(/tatuaż|inspiracj|notatk/i);
  });

  it("keeps the same wall-clock time through CET", () => {
    const url = new URL(googleCalendarUrl({ startsAt: new Date("2026-10-25T09:00:00.000Z"), endsAt: new Date("2026-10-25T10:00:00.000Z") }));
    expect(url.searchParams.get("dates")).toBe("20261025T100000/20261025T110000");
    expect(url.searchParams.get("ctz")).toBe("Europe/Warsaw");
  });
});
