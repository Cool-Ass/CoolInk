import { constants, createCipheriv, createHash, createPublicKey, publicEncrypt, randomBytes } from "node:crypto";

// Fixed recovery scope, never an arbitrary environment export selected by a caller.
export const ESCROW_KEYS = [
  "SESSION_SECRET", "MFA_ENCRYPTION_KEY", "PRIVATE_MEDIA_SIGNING_KEY",
  "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS", "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY",
  "GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI",
  "VAPID_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_SUBJECT",
] as const;
export const ESCROW_ENDPOINT = "https://www.coolinktattoo.pl/api/cron/config-escrow";

export function escrowRecipient(value: unknown) {
  if (typeof value !== "string" || value.length > 1600 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("Invalid recipient");
  const der = Buffer.from(value, "base64");
  if (der.toString("base64") !== value) throw new Error("Invalid recipient");
  const key = createPublicKey({ key: der, format: "der", type: "spki" });
  const details = key.asymmetricKeyDetails;
  if (key.asymmetricKeyType !== "rsa" || !details || ![3072, 4096].includes(details.modulusLength ?? 0) || details.publicExponent !== 65537n) throw new Error("Invalid recipient");
  if (!Buffer.from(key.export({ format: "der", type: "spki" })).equals(der)) throw new Error("Invalid recipient");
  const hash = createHash("sha256").update(der).digest("hex");
  return { key, hash, audience: `${ESCROW_ENDPOINT}?recipient=${hash}` };
}

export function sealRuntimeConfiguration(publicKey: unknown, run: string, env: Record<string, string | undefined> = process.env) {
  const recipient = escrowRecipient(publicKey);
  if (!/^\d{1,30}:\d{1,10}$/.test(run)) throw new Error("Invalid identity");
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error("Recovery configuration incomplete");
  const values: Record<string, string> = {};
  for (const key of ESCROW_KEYS) {
    const value = env[key];
    if (value) {
      if (Buffer.byteLength(value) > 8192) throw new Error("Recovery configuration invalid");
      values[key] = value;
    }
  }
  const context = { version: 1, purpose: "coolink-runtime-key-recovery", run, recipient: recipient.hash, deploymentSha: env.VERCEL_GIT_COMMIT_SHA ?? null, createdAt: new Date().toISOString() };
  const aad = Buffer.from(JSON.stringify(context));
  const plaintext = Buffer.from(JSON.stringify({ values }));
  const symmetricKey = randomBytes(32);
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", symmetricKey, iv);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const wrappedKey = publicEncrypt({ key: recipient.key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, symmetricKey);
    return { context, algorithm: "RSA-OAEP-SHA256+A256GCM", wrappedKey: wrappedKey.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
  } finally { symmetricKey.fill(0); plaintext.fill(0); }
}
