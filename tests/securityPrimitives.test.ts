import { beforeAll, describe, expect, it } from "vitest";
import { createMfaSecret, createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, totpCode, verifyMfaCode, verifyTotp } from "@/lib/adminMfa";
import { isSameOrigin } from "@/lib/requestSecurity";
import { signWebhookBody, verifyWebhookSignature } from "@/lib/webhookSecurity";

beforeAll(() => { process.env.MFA_ENCRYPTION_KEY = "test-only-mfa-encryption-key-32-characters"; });

describe("request origin protection", () => {
  it("accepts same-origin and rejects cross-origin mutations", () => {
    expect(isSameOrigin(new Request("https://coolinktattoo.pl/api/client/profile", { headers: { origin: "https://coolinktattoo.pl" } }))).toBe(true);
    expect(isSameOrigin(new Request("https://coolinktattoo.pl/api/client/profile", { headers: { origin: "https://attacker.test" } }))).toBe(false);
  });

  it("uses the public forwarded origin behind a trusted proxy", () => {
    const headers = { origin: "https://coolinktattoo.pl", "x-forwarded-host": "coolinktattoo.pl", "x-forwarded-proto": "https" };
    expect(isSameOrigin(new Request("http://internal:3000/api/contact", { headers }))).toBe(true);
    expect(isSameOrigin(new Request("http://internal:3000/api/contact", { headers: { ...headers, origin: "https://attacker.test" } }))).toBe(false);
  });
});

describe("signed webhooks", () => {
  it("verifies the body and rejects an expired timestamp", () => {
    const now = Date.UTC(2026, 8, 12, 12, 0, 0);
    const timestamp = Math.floor(now / 1_000);
    const body = JSON.stringify({ eventId: "evt_1" });
    const signature = signWebhookBody("secret", timestamp, body);
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyWebhookSignature(body, header, "secret", now)).toBe(true);
    expect(verifyWebhookSignature(body, header, "secret", now + 301_000)).toBe(false);
    expect(verifyWebhookSignature(`${body}x`, header, "secret", now)).toBe(false);
  });
});

describe("administrator MFA", () => {
  it("encrypts TOTP secrets and consumes recovery codes once", () => {
    const secret = createMfaSecret();
    expect(decryptMfaSecret(encryptMfaSecret(secret))).toBe(secret);
    const at = Date.UTC(2026, 8, 12, 12, 0, 0);
    const code = totpCode(secret, at);
    expect(verifyTotp(secret, code, at)).toBe(true);
    const recovery = createRecoveryCodes(1);
    const first = verifyMfaCode(secret, recovery.stored, recovery.plain[0], at);
    expect(first.ok).toBe(true);
    expect(verifyMfaCode(secret, first.remainingRecoveryCodes, recovery.plain[0], at).ok).toBe(false);
  });
});
