import { describe, expect, it } from "vitest";
import { DEFAULT_BOOKING_BUFFER_RULES, normalizeBookingBufferRules, resolveBookingBufferMinutes } from "../lib/bookingRules";

describe("booking buffer rules", () => {
  it("selects the buffer by service, duration and workstation", () => {
    const configuration = {
      fallback: 30,
      rules: { ...DEFAULT_BOOKING_BUFFER_RULES, workstations: { "Stanowisko 1": 60 } },
    };

    expect(resolveBookingBufferMinutes(configuration, { serviceType: "Konsultacja", durationMinutes: 30 })).toBe(15);
    expect(resolveBookingBufferMinutes(configuration, { serviceType: "Tatuaż", durationMinutes: 180 })).toBe(30);
    expect(resolveBookingBufferMinutes(configuration, { serviceType: "Tatuaż", durationMinutes: 300 })).toBe(45);
    expect(resolveBookingBufferMinutes(configuration, { serviceType: "Tatuaż", durationMinutes: 60, workstation: "Stanowisko 1" })).toBe(60);
  });

  it("bounds invalid configuration instead of accepting unsafe values", () => {
    expect(normalizeBookingBufferRules({ consultation: -1, tattooShort: 999, longSessionFromMinutes: 10 })).toEqual({
      ...DEFAULT_BOOKING_BUFFER_RULES,
      workstations: {},
      longSessionFromMinutes: 60,
    });
  });

  it("uses the legacy fallback when dynamic rules are absent", () => {
    expect(resolveBookingBufferMinutes({ fallback: 20, rules: null }, { serviceType: "Konsultacja" })).toBe(20);
  });
});
