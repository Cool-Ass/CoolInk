import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const VERSION = "v1";

function encryptionKey() {
  const value = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("Brak GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY musi zawierać 32 bajty zakodowane Base64.");
  return key;
}

export function encryptGoogleRefreshToken(value: string) {
  if (!value) throw new Error("Nie można zaszyfrować pustego tokenu.");
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleRefreshToken(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error("Nieprawidłowy zaszyfrowany token Google Calendar.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
