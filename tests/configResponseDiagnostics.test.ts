import { describe, expect, it } from "vitest";
// @ts-expect-error Standalone recovery CLI deliberately independent of app runtime.
import { boundedJson, identityClaimMatches } from "../scripts/backupRuntimeConfiguration.mjs";
describe("private configuration response diagnostics", () => {
  it("emits only booleans for identity context, not arbitrary token claims", () => {
    const token = `header.${Buffer.from(JSON.stringify({ aud: "expected", private: "do-not-expose" })).toString("base64url")}.signature`;
    const matches = identityClaimMatches(token, "expected");
    expect(matches.audience).toBe(true);
    expect(matches.subject).toBe(false);
    expect(Object.values(matches).every(value => typeof value === "boolean")).toBe(true);
    expect(JSON.stringify(matches)).not.toContain("do-not-expose");
    expect(Object.values(identityClaimMatches("invalid", "expected")).every(value => value === false)).toBe(true);
  });
  it("classifies hosting denial without exposing callback nonce or provider details", async () => {
    const response = Response.json({ protection: { vercel_auth_enabled: true, vercel_auth_callback: "private-nonce" }, error: { message: "untrusted-private-details" } }, { status: 401 });
    const error = await boundedJson(response).catch((e: unknown) => e);
    expect(error).toMatchObject({ httpStatus: 401, denial: "hosting-protection" });
    expect(JSON.stringify(error)).not.toMatch(/private-nonce|untrusted-private-details/);
  });
  it("distinguishes application identity denial and keeps unknown messages private", async () => {
    await expect(boundedJson(Response.json({ error: "Unauthorized" }, { status: 401 }))).rejects.toMatchObject({ denial: "application-identity" });
    await expect(boundedJson(Response.json({ error: "private-value" }, { status: 503 }))).rejects.toMatchObject({ denial: "unclassified", httpStatus: 503 });
    expect(await boundedJson(Response.json({ ok: true }))).toEqual({ ok: true });
  });
});
