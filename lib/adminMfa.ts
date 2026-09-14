import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const VERSION = "v1";

function keyMaterial() {
  const value = process.env.MFA_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Brak bezpiecznego klucza MFA_ENCRYPTION_KEY lub SESSION_SECRET.");
  return createHash("sha256").update(value).digest();
}

function base32Encode(value: Buffer) {
  let bits = "";
  for (const byte of value) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) {
    result += BASE32[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return result;
}

function base32Decode(value: string) {
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of clean) {
    const index = BASE32.indexOf(character);
    if (index < 0) throw new Error("Nieprawidłowy sekret MFA.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function createMfaSecret() {
  return base32Encode(randomBytes(20));
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptMfaSecret(payload: string) {
  const [version, iv, tag, encrypted] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("Nieprawidłowy zapis MFA.");
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function totpCode(secret: string, at = Date.now(), stepSeconds = 30) {
  const counter = Math.floor(at / 1000 / stepSeconds);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(binary).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, at = Date.now()) {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  return [-30_000, 0, 30_000].some((offset) => {
    const expected = Buffer.from(totpCode(secret, at + offset));
    const actual = Buffer.from(normalized);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  });
}

function recoveryDigest(code: string) {
  return createHmac("sha256", keyMaterial()).update(code.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("base64url");
}

export function createRecoveryCodes(count = 10) {
  const plain = Array.from({ length: count }, () => randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})/, "$1-"));
  return { plain, stored: JSON.stringify(plain.map(recoveryDigest)) };
}

export function verifyMfaCode(secret: string, storedRecoveryCodes: string | null, code: string, at = Date.now()) {
  if (verifyTotp(secret, code, at)) return { ok: true as const, remainingRecoveryCodes: storedRecoveryCodes };
  let hashes: string[] = [];
  try { hashes = JSON.parse(storedRecoveryCodes || "[]") as string[]; } catch { hashes = []; }
  const digest = recoveryDigest(code);
  const index = hashes.findIndex((hash) => {
    const left = Buffer.from(hash); const right = Buffer.from(digest);
    return left.length === right.length && timingSafeEqual(left, right);
  });
  if (index < 0) return { ok: false as const, remainingRecoveryCodes: storedRecoveryCodes };
  hashes.splice(index, 1);
  return { ok: true as const, remainingRecoveryCodes: JSON.stringify(hashes) };
}

export function mfaOtpAuthUri(secret: string, email: string) {
  const issuer = "CoolInk Studio";
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
}
