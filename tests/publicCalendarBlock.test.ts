import { expect, it } from "vitest";
import { publicCalendarBlock, publicCalendarBlockLabel } from "../lib/publicCalendarBlock";
const dates = { startsAt: new Date("2026-10-05T08:00:00Z"), endsAt: new Date("2026-10-05T16:00:00Z") };
it.each(["ZAJĘTY", "  zajęty  ", "ZAJĘTY · private client information"])("keeps the occupied status without disclosing reason %s", (reason) => {
  const output = publicCalendarBlock({ ...dates, reason });
  expect(output.kind).toBe("occupied");
  expect(Object.keys(output).sort()).toEqual(["endsAt", "kind", "startsAt"]);
  expect(publicCalendarBlockLabel(output.kind, "NIEDOSTĘPNY")).toBe("ZAJĘTY");
});
it.each([null, "Niedostępny", "Prywatny powód nieobecności"])("preserves unavailable status and its configured copy", (reason) => {
  const output = publicCalendarBlock({ ...dates, reason });
  expect(output.kind).toBe("unavailable");
  expect(publicCalendarBlockLabel(output.kind, "NIEDOSTĘPNY")).toBe("NIEDOSTĘPNY");
});
it("supports old block payloads without exposing any note", () => {
  expect(publicCalendarBlockLabel(undefined, "NIEDOSTĘPNY")).toBe("NIEDOSTĘPNY");
});
