import { describe, expect, it } from "vitest";
import { canClientCancelAppointment, canClientRescheduleAppointment } from "../lib/clientAppointment";

describe("client appointment cancellation", () => {
  const now = new Date("2026-09-06T10:00:00.000Z");

  it.each(["requested", "proposed", "confirmed"])(
    "allows a client to cancel a future %s appointment",
    (status) => {
      expect(
        canClientCancelAppointment(
          { status, startsAt: new Date("2026-09-07T10:00:00.000Z") },
          now
        )
      ).toBe(true);
    }
  );

  it.each(["cancelled", "completed", "no_show"])(
    "does not allow cancellation for %s",
    (status) => {
      expect(
        canClientCancelAppointment(
          { status, startsAt: new Date("2026-09-07T10:00:00.000Z") },
          now
        )
      ).toBe(false);
    }
  );

  it("does not allow cancelling a past appointment", () => {
    expect(
      canClientCancelAppointment(
        { status: "confirmed", startsAt: new Date("2026-09-05T10:00:00.000Z") },
        now
      )
    ).toBe(false);
  });
});

describe("client appointment rescheduling", () => {
  it("allows an active appointment when at least 48 hours remain", () => {
    const now = new Date("2026-09-01T10:00:00.000Z");
    expect(canClientRescheduleAppointment({ status: "confirmed", startsAt: new Date("2026-09-03T10:00:00.000Z") }, now)).toBe(true);
  });

  it("blocks a late or historical reschedule", () => {
    const now = new Date("2026-09-01T10:00:00.000Z");
    expect(canClientRescheduleAppointment({ status: "confirmed", startsAt: new Date("2026-09-03T09:59:00.000Z") }, now)).toBe(false);
    expect(canClientRescheduleAppointment({ status: "completed", startsAt: new Date("2026-09-10T10:00:00.000Z") }, now)).toBe(false);
  });
});
