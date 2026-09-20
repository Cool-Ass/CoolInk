import { describe, expect, it } from "vitest";
import { parseSessionEstimate, sessionEstimateLabel } from "../lib/sessionEstimate";
import { parseBookingDraft } from "../lib/bookingDraft";
import { clientProjectStage } from "../lib/projectWorkflow";
const empty = { estimatedSessionsMin: null, estimatedSessionsMax: null, sessionPriceCents: null };
const draft = { title: "Pomysł", description: "Opis tatuażu", placement: "Ramię", size: "15 cm", notes: "", consultationMode: "studio", leadSource: "", styles: ["Realizm"] };
describe("workflow extensions", () => {
  it("preserves unspecified estimates", () => { expect(parseSessionEstimate({}, empty)).toEqual(empty); });
  it("formats session ranges without converting historical prices", () => { expect(sessionEstimateLabel({ estimatedSessionsMin: 2, estimatedSessionsMax: 4, sessionPriceCents: 140000 })).toBe("2–4 sesji · 1400 zł / sesję"); expect(sessionEstimateLabel(empty)).toBeNull(); });
  it.each([{ estimatedSessionsMin: 0 }, { estimatedSessionsMin: 1.5 }, { estimatedSessionsMax: 101 }, { estimatedSessionsMin: 3, estimatedSessionsMax: 2 }, { sessionPriceCents: -1 }])("rejects invalid estimate %j", (body) => { expect(() => parseSessionEstimate(body, empty)).toThrow(); });
  it("keeps only supported draft fields, never photos, dates or consent acceptance", () => { expect(parseBookingDraft({ ...draft, files: ["photo"], consents: ["yes"], startsAt: "2028-01-01" })).toEqual(draft); });
  it("bounds private draft payloads", () => { expect(() => parseBookingDraft({ ...draft, description: "x".repeat(5001) })).toThrow(); expect(() => parseBookingDraft({ ...draft, styles: [1] })).toThrow(); });
  it("groups legacy statuses without changing appointment status", () => { expect(clientProjectStage("scheduled")).toBe(clientProjectStage("confirmed")); expect(clientProjectStage("awaiting_next_session")).toBe("W realizacji"); });
});
