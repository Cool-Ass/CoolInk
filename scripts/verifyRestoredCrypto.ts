import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decryptMfaSecret, totpCode, verifyTotp } from "../lib/adminMfa";
import { decryptGoogleRefreshToken } from "../lib/googleCalendarCrypto";
import { privateImageUrl, verifyPrivateImageToken } from "../lib/privateMedia";
import { createSessionToken, verifySessionToken } from "../lib/session";
// @ts-expect-error Private recovery CLI is independent of the application runtime.
import { verifyConfigurationEnvelope } from "./backupRuntimeConfiguration.mjs";

type Records = { mfa: Array<{ mfaEnabled: boolean; mfaSecretEncrypted: string | null }>; google: Array<{ encryptedRefreshToken: string }>; reviews: string | null };
export function verifyEncryptedRecords(records: Records) {
  let mfaSecrets = 0;
  for (const row of records.mfa) {
    if (row.mfaEnabled && !row.mfaSecretEncrypted) throw new Error("Missing restored MFA material");
    if (!row.mfaSecretEncrypted) continue;
    const secret = decryptMfaSecret(row.mfaSecretEncrypted);
    if (!/^[A-Z2-7]{16,128}$/.test(secret) || !verifyTotp(secret, totpCode(secret))) throw new Error("Invalid restored MFA material");
    mfaSecrets++;
  }
  for (const row of records.google) if (!decryptGoogleRefreshToken(row.encryptedRefreshToken)) throw new Error("Empty restored Google token");
  if (records.reviews && !decryptGoogleRefreshToken(records.reviews)) throw new Error("Empty restored reviews credential");
  const url = privateImageUrl("offline-recovery-probe", "client", "offline-client");
  const request = new Request("http://127.0.0.1" + url);
  if (!verifyPrivateImageToken(request, "offline-recovery-probe", "client", "offline-client")
    || verifyPrivateImageToken(request, "offline-recovery-probe", "client", "another-client")
    || verifyPrivateImageToken(request, "offline-recovery-probe", "admin", "offline-client")) throw new Error("Restored media signing failed");
  return { mfaSecrets, googleTokens: records.google.length, reviewsCredentials: records.reviews ? 1 : 0, mediaSignatureOwnership: true };
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== "true" || !/^\d{1,30}$/.test(process.env.GITHUB_RUN_ID ?? "")) throw new Error("Disposable runner required");
  // Not configurable: even a production DATABASE_URL in the runner is ignored.
  const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:restore-test@127.0.0.1:5432/coolink_restore" } }, log: [] });
  const previous = new Map<string, string | undefined>();
  let stage = "offline-database-guard";
  try {
    const records = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const [{ name }] = await tx.$queryRawUnsafe<Array<{ name: string }>>("SELECT current_database() AS name");
      if (name !== "coolink_restore") throw new Error("Wrong restore target");
      const mfa = await tx.adminUser.findMany({ select: { mfaEnabled: true, mfaSecretEncrypted: true } });
      const google = await tx.googleCalendarConnection.findMany({ select: { encryptedRefreshToken: true } });
      const reviews = await tx.siteSetting.findUnique({ where: { key: "private_google_reviews_api_key" }, select: { value: true } });
      if (mfa.length + google.length > 10000) throw new Error("Inventory too large");
      return { mfa, google, reviews: reviews?.value || null };
    }, { isolationLevel: "RepeatableRead" });
    stage = "sealed-configuration";
    const root = resolve("restored/runtime-config");
    const envelope = JSON.parse(await readFile(resolve(root, "sealed.json"), "utf8"));
    const privateKey = await readFile(resolve(root, "recipient-private.pem"), "utf8");
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
    let coverage: ReturnType<typeof verifyEncryptedRecords> | undefined;
    const actual = verifyConfigurationEnvelope(envelope, privateKey, manifest.run, (values: Record<string, string>) => {
      for (const key of ["SESSION_SECRET", "MFA_ENCRYPTION_KEY", "PRIVATE_MEDIA_SIGNING_KEY", "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS", "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY"]) {
        previous.set(key, process.env[key]); delete process.env[key];
      }
      for (const [key, value] of Object.entries(values)) { if (!previous.has(key)) previous.set(key, process.env[key]); process.env[key] = value; }
      stage = "restored-record-decryption";
      coverage = verifyEncryptedRecords(records);
    });
    if (JSON.stringify(actual) !== JSON.stringify(manifest) || !coverage) throw new Error("Manifest mismatch");
    stage = "restored-session-signing";
    const token = await createSessionToken({ sub: "offline-admin", email: "drill@example.invalid", version: 1 });
    if ((await verifySessionToken(token))?.sub !== "offline-admin" || await verifySessionToken(token + "tampered")) throw new Error("Restored session signing failed");
    console.log(JSON.stringify({ verified: "restored-cryptographic-records", ...coverage, sessionSigning: true, deploymentSha: actual.deploymentSha }));
  } catch { console.error(`Restored cryptographic verification failed at ${stage}; private diagnostics withheld`); process.exitCode = 1; }
  finally {
    for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await prisma.$disconnect();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main().catch(() => { console.error("Restored crypto drill guard failed"); process.exitCode = 1; });
