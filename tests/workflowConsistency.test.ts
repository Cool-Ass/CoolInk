import { describe, expect, it } from "vitest";
import { projectStatusAfterAppointmentChange } from "../lib/projectLifecycle";
import { appointmentStatusLabel, depositStatusLabel, projectStatusLabel } from "../lib/workflowStatus";

describe("workflow consistency", () => {
  it("uses Polish labels and never falls back to a raw stored status", () => {
    expect(appointmentStatusLabel("proposed")).toBe("OCZEKUJE NA TWOJĄ DECYZJĘ");
    expect(projectStatusLabel("awaiting_confirmation")).toBe("OCZEKUJE NA STUDIO");
    expect(depositStatusLabel("not_required")).toBe("ZADATEK NIEWYMAGANY");
    expect(projectStatusLabel("unknown_value")).not.toBe("unknown_value");
  });

  it("cancels a project only when no active session remains", () => {
    expect(projectStatusAfterAppointmentChange([{ status: "cancelled" }], "not_required", "confirmed")).toBe("cancelled");
    expect(projectStatusAfterAppointmentChange([{ status: "cancelled" }, { status: "confirmed" }], "not_required", "confirmed")).toBe("confirmed");
  });

  it("keeps deposit state connected to confirmed sessions", () => {
    expect(projectStatusAfterAppointmentChange([{ status: "confirmed" }], "awaiting", "inquiry")).toBe("awaiting_deposit");
  });
});
