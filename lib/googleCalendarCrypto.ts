import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const VERSION = "v1";

function encryptionKeys() {
  const values = (process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS || process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!values.length) throw new Error("Brak GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS.");
  return values.map((value) => {
    const key = Buffer.from(value, "base64");
    if (key.length !== 32) throw new Error("Każdy klucz Google Calendar musi zawierać 32 bajty zakodowane Base64.");
    return key;
  });
}

export function encryptGoogleRefreshToken(value: string) {
  if (!value) throw new Error("Nie można zaszyfrować pustego tokenu.");
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleRefreshToken(payload: string) {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error("Nieprawidłowy zaszyfrowany token Google Calendar.");
  for (const key of encryptionKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
      decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
    } catch { /* try an older key during rotation */ }
  }
  throw new Error("Nie można odszyfrować tokenu Google Calendar żadnym aktywnym kluczem.");
}
