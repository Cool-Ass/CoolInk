import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { randomBytes, createHmac } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const origin = "http://127.0.0.1:9999";
// No supplied DATABASE_URL or Supabase endpoint is accepted by this drill.
const database = "postgresql://postgres:restore-test@127.0.0.1:5432/coolink_restore";
const image = "supabase/gotrue:v2.196.0"; // Official self-hosted compose, verified 2026-10-02.

export function assertRestoredAuthInventory(expected, actual, linked) {
  const wanted = new Set(expected); const found = new Set(actual);
  if (!wanted.size || wanted.size !== expected.length || found.size !== actual.length || found.size !== wanted.size
    || expected.some(id => !found.has(id)) || linked.some(id => !found.has(id))) throw new Error("Restored identity inventory mismatch");
}

function serviceToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role: "service_role", aud: "authenticated", iss: origin, iat: now, exp: now + 600 })).toString("base64url");
  const data = `${head}.${payload}`;
  return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}

async function json(path, init = {}) {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid local probe");
  const response = await fetch(origin + path, { ...init, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Local Auth probe failed");
  return response.json();
}

async function startupDiagnostics(container) {
  // Never dump server logs: they may contain restored customer data or secrets.
  const state = await exec("docker", ["inspect", "--format", "{{.State.ExitCode}}", container], { timeout: 5000 }).catch(() => null);
  const logs = await exec("docker", ["logs", container], { timeout: 5000, maxBuffer: 1024 * 1024 }).catch(() => null);
  const text = (logs?.stdout ?? "") + (logs?.stderr ?? "");
  const classes = [];
  for (const [label, pattern] of [
    ["MIGRATION", /migrat/i], ["PERMISSION", /permission denied/i], ["MISSING_RELATION", /relation .* does not exist/i],
    ["MISSING_COLUMN", /column .* does not exist/i], ["CONFIG_REQUIRED", /required|missing configuration/i],
    ["ROLE", /role .* does not exist/i], ["NETWORK", /connection refused|dial tcp/i],
  ]) if (pattern.test(text)) classes.push(label);
  const sqlState = text.match(/SQLSTATE ([A-Z0-9]{5})/)?.[1];
  const key = text.match(/required key (GOTRUE_[A-Z0-9_]+|API_EXTERNAL_URL)/)?.[1];
  console.error("RESTORED_AUTH_STARTUP", { exitCode: /^\d{1,3}\s*$/.test(state?.stdout ?? "") ? Number(state.stdout) : null, classes, ...(sqlState ? { sqlState } : {}), ...(key ? { requiredEnvironmentName: key } : {}) });
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== "true" || !/^\d{1,30}$/.test(process.env.GITHUB_RUN_ID ?? "")) throw new Error("Drill requires disposable GitHub runner");
  const started = Date.now(); const prisma = new PrismaClient({ datasources: { db: { url: database } }, log: [] });
  const container = `coolink-drill-auth-${process.env.GITHUB_RUN_ID}`;
  let stage = "offline-database-guard"; let containerStarted = false;
  try {
    const [{ name }] = await prisma.$queryRawUnsafe("SELECT current_database() AS name");
    if (name !== "coolink_restore") throw new Error("Wrong restore target");
    const users = await prisma.$queryRawUnsafe("SELECT id::text AS id FROM auth.users ORDER BY id");
    const linked = await prisma.$queryRawUnsafe('SELECT "supabaseUserId" AS id FROM public."Client" WHERE "supabaseUserId" IS NOT NULL');
    if (!users.length || users.length > 100000) throw new Error("Invalid restored inventory");
    stage = "local-auth-start";
    const secret = randomBytes(48).toString("base64url");
    const directory = await mkdtemp(join(tmpdir(), "coolink-auth-drill-"));
    const environment = join(directory, "auth.private.env");
    await writeFile(environment, Object.entries({
      GOTRUE_API_HOST: "127.0.0.1", GOTRUE_API_PORT: "9999", API_EXTERNAL_URL: origin,
      GOTRUE_DB_DRIVER: "postgres", GOTRUE_DB_DATABASE_URL: database,
      GOTRUE_SITE_URL: "http://127.0.0.1:3120", GOTRUE_DISABLE_SIGNUP: "true",
      GOTRUE_JWT_SECRET: secret, GOTRUE_JWT_ADMIN_ROLES: "service_role", GOTRUE_JWT_AUD: "authenticated",
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true", GOTRUE_MAILER_AUTOCONFIRM: "true", GOTRUE_LOG_LEVEL: "error",
    }).map(([key, value]) => `${key}=${value}`).join("\n"), { mode: 0o600 });
    await exec("docker", ["run", "--detach", "--rm", "--name", container, "--network", "host", "--env-file", environment, image], { timeout: 180000, maxBuffer: 1024 * 1024 });
    containerStarted = true;
    stage = "local-auth-health";
    let healthy = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { await json("/health"); healthy = true; break; } catch { await new Promise(done => setTimeout(done, 500)); }
    }
    if (!healthy) { await startupDiagnostics(container); throw new Error("Restored Auth did not start"); }
    stage = "restored-user-inventory";
    const token = serviceToken(secret); const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    const actual = [];
    for (let page = 1; actual.length < users.length && page <= 101; page++) {
      const result = await json(`/admin/users?page=${page}&per_page=1000`, { headers });
      if (!Array.isArray(result.users) || !result.users.length) break;
      actual.push(...result.users.map(user => user.id));
    }
    assertRestoredAuthInventory(users.map(user => user.id), actual, linked.map(client => client.id));
    stage = "isolated-password-login";
    // Newly created fixture ONLY in the restored disposable database. This proves
    // the running password flow, not knowledge of any customer's password.
    const email = `drill-${randomBytes(12).toString("hex")}@example.invalid`;
    const password = randomBytes(32).toString("base64url");
    const fixture = await json("/admin/users", { method: "POST", headers, body: JSON.stringify({ email, password, email_confirm: true }) });
    if (!fixture.id || actual.includes(fixture.id)) throw new Error("Invalid isolated fixture");
    const login = await json("/token?grant_type=password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!login.access_token || login.user?.id !== fixture.id) throw new Error("Restored password grant failed");
    const verified = await json("/user", { headers: { authorization: `Bearer ${login.access_token}` } });
    if (verified.id !== fixture.id) throw new Error("Restored user verification failed");
    console.log(JSON.stringify({ verified: "restored-auth-runtime", restoredUsers: users.length, linkedClients: linked.length, isolatedPasswordFlow: true, durationMs: Date.now() - started }));
  } catch { console.error(`Restored Auth runtime failed at ${stage}; private diagnostics withheld`); process.exitCode = 1; }
  finally {
    if (containerStarted) await exec("docker", ["stop", "--time", "5", container], { timeout: 15000 }).catch(() => { process.exitCode = 1; });
    await prisma.$disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main().catch(() => { console.error("Restored Auth drill guard failed"); process.exitCode = 1; });
