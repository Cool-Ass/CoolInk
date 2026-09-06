import { describe, expect, it } from "vitest";
import { canClientCancelAppointment } from "../lib/clientAppointment";

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

