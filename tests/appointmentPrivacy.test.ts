import { describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ conflict: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { availableSlot: { findFirst: async () => ({ id: "public" }) } } }));
vi.mock("@/lib/bookingRules", () => ({ validAppointmentRange: () => true, bookingConflict: m.conflict }));
import { verifyExplicitAppointmentAvailability } from "../lib/appointmentAvailability";
describe("public booking conflict privacy", () => {
  it.each([
    { appointment: { project: { title: "Private client tattoo" } }, block: null },
    { appointment: null, block: { reason: "Private medical leave" } },
  ])("does not expose the conflicting appointment or block", async conflict => {
    m.conflict.mockResolvedValue(conflict);
    const result = await verifyExplicitAppointmentAvailability(new Date(), new Date());
    expect(result).toEqual({ ok: false, status: 409, error: "Termin jest już niedostępny. Wybierz inny." });
    expect(JSON.stringify(result)).not.toContain("Private");
  });
});
