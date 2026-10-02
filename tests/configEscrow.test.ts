import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { escrowRecipient, ESCROW_ENDPOINT, sealRuntimeConfiguration } from "../lib/configEscrow";
// @ts-expect-error Recovery CLI is an executable ES module, deliberately independent of the app runtime.
import { verifyConfigurationEnvelope } from "../scripts/backupRuntimeConfiguration.mjs";

const pair = generateKeyPairSync("rsa", { modulusLength: 3072 });
const publicKey = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64");
const env = { SESSION_SECRET: "test-only-session-material-32-characters", MFA_ENCRYPTION_KEY: "test-only-mfa-material-32-characters", UNRELATED_SECRET: "must-not-export" };
function decrypt(envelope: ReturnType<typeof sealRuntimeConfiguration>) {
  const key = privateDecrypt({ key: pair.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(envelope.wrappedKey, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(JSON.stringify(envelope.context)));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]).toString());
}
describe("runtime configuration escrow", () => {
  it("binds verified workflow audience to the canonical recipient", () => {
    const recipient = escrowRecipient(publicKey);
    expect(recipient.audience).toBe(`${ESCROW_ENDPOINT}?recipient=${recipient.hash}`);
    expect(recipient.hash).toMatch(/^[a-f0-9]{64}$/);
  });
  it("restores exact current keys only to the ephemeral recipient, without exporting unrelated environment", () => {
    const sealed = sealRuntimeConfiguration(publicKey, "123:1", env);
    expect(JSON.stringify(sealed)).not.toContain(env.SESSION_SECRET);
    expect(decrypt(sealed)).toEqual({ values: { SESSION_SECRET: env.SESSION_SECRET, MFA_ENCRYPTION_KEY: env.MFA_ENCRYPTION_KEY } });
    expect(verifyConfigurationEnvelope(sealed, pair.privateKey, "123:1")).toEqual(expect.objectContaining({ verified: true, keys: ["MFA_ENCRYPTION_KEY", "SESSION_SECRET"] }));
    expect(() => verifyConfigurationEnvelope(sealed, pair.privateKey, "another-run")).toThrow();
    const other = generateKeyPairSync("rsa", { modulusLength: 3072 });
    expect(() => privateDecrypt({ key: other.privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(sealed.wrappedKey, "base64"))).toThrow();
  });
  it("authenticates metadata and uses fresh randomized encryption", () => {
    const a = sealRuntimeConfiguration(publicKey, "123:1", env);
    const b = sealRuntimeConfiguration(publicKey, "123:1", env);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(() => decrypt({ ...a, context: { ...a.context, run: "124:1" } })).toThrow();
    expect(() => decrypt({ ...a, tag: Buffer.alloc(16).toString("base64") })).toThrow();
  });
  it("fails closed for malformed, weak or non-RSA recipients and missing configuration", () => {
    const weak = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    for (const value of [null, "invalid", publicKey + "\n", "a".repeat(2000), weak.publicKey.export({ format: "der", type: "spki" }).toString("base64"), ec.publicKey.export({ format: "der", type: "spki" }).toString("base64")]) expect(() => escrowRecipient(value)).toThrow();
    expect(() => sealRuntimeConfiguration(publicKey, "123:1", {})).toThrow();
    expect(() => sealRuntimeConfiguration(publicKey, "not-a-run", env)).toThrow();
    expect(() => sealRuntimeConfiguration(publicKey, "123:1", { ...env, MFA_ENCRYPTION_KEY: "x".repeat(9000) })).toThrow();
  });
});
