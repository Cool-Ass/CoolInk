import { describe, expect, it } from "vitest";
import { validatePrivacyReview, publicPrivacyStatus } from "../lib/privacyReview";
import { privacyRevision } from "../lib/privacyRevision";
const plan = { decision: "retain", identityConfirmed: true, reason: "Wymagana dokumentacja rozliczenia", response: "Rozliczenia pozostają przechowywane do wskazanej daty.", retainedScopes: ["financial"], retainUntil: "2040-01-01" };
describe("owner privacy review plan", () => {
  it("requires identity, justification, response and exact future retention date without defaults", () => {
    expect(validatePrivacyReview(plan).retainUntil).toBe("2040-01-01");
    for (const change of [{ identityConfirmed: false }, { reason: "" }, { response: "" }, { retainedScopes: ["passwords"] }, { retainedScopes: ["financial", "financial"] }, { retainUntil: "2020-01-01" }, { retainUntil: "2040-02-31" }, { decision: "completed" }]) expect(() => validatePrivacyReview({ ...plan, ...change })).toThrow();
    expect(() => validatePrivacyReview({ ...plan, decision: "approve", retainedScopes: [], retainUntil: "" })).not.toThrow();
  });
  it("keeps internal reasoning, actor and identity evidence out of client projections", () => {
    const note = JSON.stringify({ version: 1, ...plan, reviewerId: "private-actor", reviewedAt: new Date().toISOString() });
    const output = publicPrivacyStatus({ status: "awaiting_execution", note, requestedAt: new Date() });
    expect(output.label).toBe("Oczekuje osobnego zatwierdzenia wykonania");
    expect(JSON.stringify(output)).not.toContain("private-actor");
    expect(JSON.stringify(output)).not.toContain(plan.reason);
    expect(publicPrivacyStatus({ status: "completed", note: "legacy private note", requestedAt: new Date() }).response).toBeNull();
  });
  it("binds revision to status, note and resolution without changing receipt time", () => {
    const receipt = { status: "pending", note: null, resolvedAt: null };
    expect(privacyRevision(receipt)).toMatch(/^[a-f0-9]{64}$/);
    expect(privacyRevision({ ...receipt, status: "reviewing" })).not.toBe(privacyRevision(receipt));
    expect(privacyRevision({ ...receipt, note: "new plan" })).not.toBe(privacyRevision(receipt));
  });
});
