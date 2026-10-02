import { describe, expect, it } from "vitest";
// @ts-expect-error Standalone recovery CLI deliberately independent of app runtime.
import { boundedJson } from "../scripts/backupRuntimeConfiguration.mjs";
describe("private configuration response diagnostics", () => {
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
