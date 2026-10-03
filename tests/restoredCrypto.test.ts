import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { createMfaSecret, encryptMfaSecret } from "../lib/adminMfa";
import { encryptGoogleRefreshToken } from "../lib/googleCalendarCrypto";
import { verifyEncryptedRecords } from "../scripts/verifyRestoredCrypto";
import { verifyRestoredAdminHttp } from "../scripts/verifyRestoredAdminHttp";
import type { PrismaClient } from "@prisma/client";
beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "offline-only-session-material-at-least-32-characters");
  vi.stubEnv("MFA_ENCRYPTION_KEY", "offline-only-mfa-material-at-least-32-characters");
  vi.stubEnv("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS", Buffer.alloc(32, 7).toString("base64"));
});
afterEach(() => vi.unstubAllEnvs());
describe("restored encrypted records", () => {
  it("refuses the HTTP drill outside a disposable runner before querying any database", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "false");
    const query = vi.fn();
    await expect(verifyRestoredAdminHttp({ $queryRawUnsafe: query } as unknown as PrismaClient)).rejects.toThrow("Disposable runner required");
    expect(query).not.toHaveBeenCalled();
  });
  it("blocks provider fetches in the recovery application child before network access", () => {
    const result = spawnSync(process.execPath, ["--require", resolve("scripts/recoveryLocalFetch.cjs"), "-e", 'try { fetch("https://example.invalid/private"); process.exitCode = 2; } catch { process.stdout.write("blocked"); }'], { encoding: "utf8", timeout: 10000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("blocked");
  });
  it("executes the real tsx CLI without CommonJS/top-level-await transform errors", () => {
    const result = spawnSync(process.execPath, [resolve("node_modules/tsx/dist/cli.mjs"), resolve("scripts/verifyRestoredCrypto.ts")], { env: { ...process.env, GITHUB_ACTIONS: "false", GITHUB_RUN_ID: "invalid" }, encoding: "utf8", timeout: 10000 });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).toBe("Restored crypto drill guard failed");
  });
  it("uses actual application crypto and reports only aggregate coverage", () => {
    const secret = createMfaSecret();
    expect(verifyEncryptedRecords({ mfa: [{ mfaEnabled: true, mfaSecretEncrypted: encryptMfaSecret(secret) }], google: [{ encryptedRefreshToken: encryptGoogleRefreshToken("fixture-not-a-production-token") }], reviews: encryptGoogleRefreshToken("fixture-reviews") })).toEqual({ mfaSecrets: 1, googleTokens: 1, revokedGoogleConnections: 0, reviewsCredentials: 1, mediaSignatureOwnership: true });
  });
  it("fails on wrong recovered keys and enabled MFA without its secret", () => {
    const mfa = encryptMfaSecret(createMfaSecret()); const google = encryptGoogleRefreshToken("fixture-token");
    vi.stubEnv("MFA_ENCRYPTION_KEY", "wrong-offline-mfa-material-at-least-32-characters");
    expect(() => verifyEncryptedRecords({ mfa: [{ mfaEnabled: true, mfaSecretEncrypted: mfa }], google: [], reviews: null })).toThrow();
    vi.stubEnv("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS", Buffer.alloc(32, 8).toString("base64"));
    expect(() => verifyEncryptedRecords({ mfa: [], google: [{ encryptedRefreshToken: google }], reviews: null })).toThrow();
    expect(() => verifyEncryptedRecords({ mfa: [{ mfaEnabled: true, mfaSecretEncrypted: null }], google: [], reviews: null })).toThrow();
  });
  it("explicitly reports zero existing encrypted records, without pretending MFA or OAuth is configured", () => {
    expect(verifyEncryptedRecords({ mfa: [], google: [], reviews: null })).toEqual({ mfaSecrets: 0, googleTokens: 0, revokedGoogleConnections: 0, reviewsCredentials: 0, mediaSignatureOwnership: true });
  });
  it("counts revoked connections separately and rejects all other invalid ciphertext", () => {
    expect(verifyEncryptedRecords({ mfa: [], google: [{ encryptedRefreshToken: "REVOKED" }], reviews: null })).toMatchObject({ googleTokens: 0, revokedGoogleConnections: 1 });
    expect(() => verifyEncryptedRecords({ mfa: [], google: [{ encryptedRefreshToken: "REVOKED-with-extra-data" }], reviews: null })).toThrow();
  });
});
