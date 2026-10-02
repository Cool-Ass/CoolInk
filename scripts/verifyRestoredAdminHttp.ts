import type { PrismaClient } from "@prisma/client";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { createMfaSecret, decryptMfaSecret, encryptMfaSecret, totpCode } from "../lib/adminMfa";

const database = "postgresql://postgres:restore-test@127.0.0.1:5432/coolink_restore";
const origin = "http://127.0.0.1:3217";
export async function verifyRestoredAdminHttp(prisma: PrismaClient) {
  if (process.env.GITHUB_ACTIONS !== "true" || !/^\d{1,30}$/.test(process.env.GITHUB_RUN_ID ?? "")) throw new Error("Disposable runner required");
  const [{ name }] = await prisma.$queryRawUnsafe<Array<{ name: string }>>("SELECT current_database() AS name");
  if (name !== "coolink_restore") throw new Error("Wrong restore target");
  const material = await prisma.adminUser.findFirst({ where: { mfaEnabled: true, mfaSecretEncrypted: { not: null } }, select: { mfaSecretEncrypted: true } });
  const encrypted = material?.mfaSecretEncrypted || encryptMfaSecret(createMfaSecret());
  const seed = decryptMfaSecret(encrypted);
  const password = randomBytes(32).toString("base64url");
  // Clone only the restored MFA ciphertext into an ephemeral local fixture.
  // No existing user's password, address, or record is changed.
  const fixture = await prisma.adminUser.create({ data: { email: `drill-${randomBytes(12).toString("hex")}@example.invalid`, name: "Recovery fixture", role: "owner", passwordHash: await bcrypt.hash(password, 12), mfaEnabled: true, mfaSecretEncrypted: encrypted } });
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", DATABASE_URL: database, DATABASE_DIRECT_URL: database, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9998", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "offline-unused", NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--require=${resolve("scripts/recoveryLocalFetch.cjs")}` };
  // Restored provider credentials are checked cryptographically elsewhere;
  // the HTTP drill must never send notifications or call their real providers.
  for (const key of Object.keys(env)) if (/^(GOOGLE_|VAPID_|S3_|BLOB_|SUPABASE_SERVICE_ROLE_KEY|BACKUP_ENCRYPTION_PASSWORD|VERCEL_|CRON_SECRET)/.test(key)) delete env[key as keyof typeof env];
  const next = resolve("node_modules/next/dist/bin/next");
  let server: ReturnType<typeof spawn> | undefined;
  let stage = "offline-build";
  try {
    const build = spawnSync(process.execPath, [next, "build"], { env, stdio: "ignore", timeout: 240000 });
    if (build.status !== 0) throw new Error("Offline application build failed");
    stage = "offline-server-start";
    const runningServer = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "3217"], { env, stdio: "ignore" });
    server = runningServer;
    const call = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual", signal: AbortSignal.timeout(10000) });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (runningServer.exitCode !== null) throw new Error("Offline server exited");
      try { if ((await call("/api/admin/mfa")).status === 401) { ready = true; break; } } catch { /* bounded startup */ }
      await new Promise(done => setTimeout(done, 500));
    }
    if (!ready) throw new Error("Offline server did not start");
    const login = (mfaCode?: string, requestOrigin = origin) => call("/api/admin/login", { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify({ email: fixture.email, password, mfaCode }) });
    stage = "mfa-boundary";
    if ((await login(undefined, "https://example.invalid")).status !== 403 || (await login()).status !== 428 || (await login("invalid-code")).status !== 401) throw new Error("Restored MFA boundary failed");
    stage = "mfa-login";
    const authenticated = await login(totpCode(seed));
    const cookie = authenticated.headers.get("set-cookie")?.match(/coolink_admin_session=([^;]+)/)?.[0];
    if (authenticated.status !== 200 || !cookie) throw new Error("Restored MFA login failed");
    stage = "authenticated-session";
    if ((await call("/api/admin/mfa", { headers: { cookie } })).status !== 200) throw new Error("Restored session not usable");
    stage = "session-revocation";
    await prisma.adminUser.update({ where: { id: fixture.id }, data: { sessionVersion: { increment: 1 } } });
    if ((await call("/api/admin/mfa", { headers: { cookie } })).status !== 401) throw new Error("Restored session revocation failed");
    return { productionHttpLogin: true, mfaChallengeAndRejection: true, sessionRevocation: true, restoredMfaCiphertextUsed: Boolean(material?.mfaSecretEncrypted), fixtureOnlyMfa: !material?.mfaSecretEncrypted };
  } catch {
    console.error("RESTORED_ADMIN_HTTP_FAILED_STAGE", stage);
    throw new Error("Restored admin HTTP verification failed");
  } finally {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([new Promise(done => server!.once("exit", done)), new Promise(done => setTimeout(done, 5000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
    await prisma.adminUser.delete({ where: { id: fixture.id } });
  }
}
