import { describe, expect, it } from "vitest";
import { privacyExecutionPlan } from "../lib/privacyExecutionPlan";
const review = { version: 1, decision: "approve", identityConfirmed: true, reason: "Zweryfikowano zakres i podstawę retencji.", response: "Wniosek zatwierdzony do osobnego wykonania.", retainedScopes: [], retainUntil: null, reviewerId: "owner", reviewedAt: "2026-10-03T00:00:00Z" };
const counts = { financial: 0, consents: 0, futureAppointments: 0, googleLinks: 0 };
describe("privacy execution safeguards", () => {
  it("requires an approved verified review, current retention and dependencies", () => {
    expect(privacyExecutionPlan(JSON.stringify(review), counts).retainedScopes).toEqual([]);
    for (const change of [{ decision: "review" }, { identityConfirmed: false }, { retainedScopes: ["financial"], retainUntil: "2000-01-01" }, { retainedScopes: ["auth"], retainUntil: "2099-01-01" }, { retainedScopes: ["chat"], retainUntil: "2099-01-01" }]) expect(() => privacyExecutionPlan(JSON.stringify({ ...review, ...change }), counts)).toThrow();
  });
  it("does not cascade statutory records or ignore future appointments or Google", () => {
    for (const key of Object.keys(counts)) expect(() => privacyExecutionPlan(JSON.stringify(review), { ...counts, [key]: 1 })).toThrow();
    const retained = { ...review, retainedScopes: ["financial", "consents", "profile"], retainUntil: "2099-01-01" };
    expect(privacyExecutionPlan(JSON.stringify(retained), { ...counts, financial: 1, consents: 1 }).retainedScopes).toHaveLength(3);
  });
});
