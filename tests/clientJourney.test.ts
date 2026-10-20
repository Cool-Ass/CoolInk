import { describe, expect, it } from "vitest";
import { bookingSteps, clientJourneyStage } from "../lib/clientJourney";
describe("focused client journey", () => {
  it("omits date and empty consent steps", () => { expect(bookingSteps(false)).toEqual([1, 4]); expect(bookingSteps(true)).toEqual([1, 3, 4]); });
  it("does not ask an unconfirmed client to sign session documents", () => { expect(clientJourneyStage("requested", 3)).toBe(1); expect(clientJourneyStage("proposed", 3)).toBe(1); });
  it("prioritizes missing session signatures for a confirmed visit", () => { expect(clientJourneyStage("confirmed", 2)).toBe(2); expect(clientJourneyStage("confirmed", 0)).toBe(3); });
  it("does not show cancelled and missed visits as pending confirmation", () => { expect(clientJourneyStage("cancelled")).toBeNull(); expect(clientJourneyStage("no_show")).toBeNull(); });
  it("distinguishes completion, settlement and aftercare", () => { expect(clientJourneyStage("completed", 0, false)).toBe(4); expect(clientJourneyStage("completed", 0, true)).toBe(5); });
});
