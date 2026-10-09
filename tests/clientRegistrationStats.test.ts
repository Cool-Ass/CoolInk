import { expect, it } from "vitest";
import { verifiedRegistrationDate, summarizeRegisteredClients } from "../lib/clientRegistrationStats";

it("accepts only a real date from the verified Auth user", () => {
  expect(verifiedRegistrationDate("2026-10-01T10:00:00Z")).toEqual(new Date("2026-10-01T10:00:00Z"));
  expect(verifiedRegistrationDate("invalid")).toBeNull();
  expect(verifiedRegistrationDate(undefined)).toBeNull();
  expect(verifiedRegistrationDate({ created_at: "2026-10-01" })).toBeNull();
});

it("counts people once and distinguishes a project without a booking", () => {
  expect(summarizeRegisteredClients([
    { projects: [] },
    { projects: [{ _count: { appointments: 0 } }] },
    { projects: [{ _count: { appointments: 0 } }, { _count: { appointments: 2 } }] },
  ])).toEqual({ total: 3, withoutProject: 1, withoutAppointment: 2 });
  expect(summarizeRegisteredClients([])).toEqual({ total: 0, withoutProject: 0, withoutAppointment: 0 });
});
