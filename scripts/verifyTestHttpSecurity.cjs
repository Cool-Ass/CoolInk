/*
 * HTTP-level PostgREST regression test. It deliberately accepts only the
 * isolated COOLINK APP project and never logs credentials or response bodies.
 */
const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("./dryRunTestEnv.cjs");

const tables = [
  "AdminUser", "AdminAuditLog", "AdminPushSubscription", "Appointment", "AvailabilityBlock", "Client", "ClientNotification",
  "AccountDeletionRequest", "AvailableSlot", "CalendarEvent",
  "GoogleCalendarConnection", "GoogleCalendarSelection", "GoogleCalendarEventSync",
  "ContactMessage", "DocumentAcceptance", "Media", "NavItem", "Page", "PageRevision", "PortfolioItem",
  "ProjectActivity", "ProjectImage", "ProjectMessage", "DirectMessage", "Promotion", "SiteSetting", "StudioDocument", "StudioDocumentVersion",
  "TattooProject", "WebhookReceipt", "WaitlistEntry", "PushSubscription", "ReminderDelivery", "InventoryItem", "InventoryMovement",
  "RateLimitBucket", "WorkingHours", "WorkingHoursOverride",
];

function headers(key, token) {
  return { apikey: key, Authorization: `Bearer ${token || key}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

function probeFilter(table) {
  return table === "SiteSetting" ? "key=eq.__security_probe__" : "id=eq.__security_probe__";
}

async function request(url, key, token, method, table) {
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?${probeFilter(table)}`, {
    method, headers: headers(key, token), body: ["POST", "PATCH"].includes(method) ? "{}" : undefined,
  });
  // A 2xx response is not acceptable: this architecture exposes no direct
  // Data API operation. Never print the potentially sensitive payload.
  if (response.ok) throw new Error(`${method} ${table}: HTTP ${response.status} unexpectedly allowed`);
  return response.status;
}

async function signUp(url, key, label, prisma) {
  const email = `coolink-security-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `CoolInk!${randomUUID()}A1`;
  const response = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: headers(key), body: JSON.stringify({ email, password }) });
  let data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.user?.id) throw new Error("Could not create a disposable test client.");
  const userId = data.user.id;
  if (!data.access_token) {
    await prisma.$executeRawUnsafe("UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1::uuid", userId);
    const login = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(key), body: JSON.stringify({ email, password }) });
    data = await login.json().catch(() => ({}));
    if (!login.ok || !data?.access_token) throw new Error("Could not establish a confirmed disposable test session.");
  }
  return { email, token: data.access_token, userId };
}

function storageObjectUrl(url, mode, path) {
  const accessPrefix = mode ? `${mode}/` : "";
  return `${url}/storage/v1/object/${accessPrefix}project-inspirations/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function checkPrivateStorage(url, key, owner, foreign, createdObjects) {
  const probe = `security-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
  const ownerPath = `${owner.userId}/${probe}`;
  const forgedPath = `${foreign.userId}/forged-${probe}`;
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const uploadHeaders = (token) => ({ ...headers(key, token), "Content-Type": "image/png", "x-upsert": "false" });

  const uploaded = await fetch(storageObjectUrl(url, "", ownerPath), { method: "POST", headers: uploadHeaders(owner.token), body: pixel });
  if (!uploaded.ok) throw new Error(`Owner storage upload returned ${uploaded.status}.`);
  createdObjects.push(ownerPath);

  const ownerRead = await fetch(storageObjectUrl(url, "authenticated", ownerPath), { headers: headers(key, owner.token) });
  if (!ownerRead.ok) throw new Error(`Owner storage read returned ${ownerRead.status}.`);
  const foreignRead = await fetch(storageObjectUrl(url, "authenticated", ownerPath), { headers: headers(key, foreign.token) });
  if (foreignRead.ok) throw new Error("Client B read client A's private inspiration.");
  const publicRead = await fetch(storageObjectUrl(url, "public", ownerPath), { headers: { apikey: key } });
  if (publicRead.ok) throw new Error("Private inspiration is reachable through the public storage endpoint.");
  const forgedUpload = await fetch(storageObjectUrl(url, "", forgedPath), { method: "POST", headers: uploadHeaders(owner.token), body: pixel });
  if (forgedUpload.ok) { createdObjects.push(forgedPath); throw new Error("Client A uploaded into client B's private folder."); }
  console.log("PASS: private inspiration bucket blocks public and cross-client reads/writes.");
}

async function checkPrincipal(label, url, key, token) {
  const results = [];
  for (const table of tables) {
    const row = { table, SELECT: await request(url, key, token, "GET", table) };
    // These methods must be denied even when the predicate matches no row.
    row.INSERT = await request(url, key, token, "POST", table);
    row.UPDATE = await request(url, key, token, "PATCH", table);
    row.DELETE = await request(url, key, token, "DELETE", table);
    results.push(row);
  }
  console.log(`PASS: ${label} denied for ${results.length} application tables.`);
  return results;
}

async function main() {
  const env = loadDryRunEnvironment();
  const url = requireTestProject(env);
  const databaseUrl = requireTestDatabase(env);
  const key = env.DRY_RUN_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Missing DRY_RUN_SUPABASE_PUBLISHABLE_KEY in ignored .env.dryrun.local.");
  process.env.DATABASE_URL = databaseUrl;
  const prisma = new PrismaClient();

  const createdEmails = [];
  const createdStorageObjects = [];
  try {
    const anon = await checkPrincipal("anon", url, key, null);
    const clientA = await signUp(url, key, "a", prisma); createdEmails.push(clientA.email);
    const clientB = await signUp(url, key, "b", prisma); createdEmails.push(clientB.email);
    await checkPrivateStorage(url, key, clientA, clientB, createdStorageObjects);
    const authenticatedA = await checkPrincipal("authenticated client A", url, key, clientA.token);
    const authenticatedB = await checkPrincipal("authenticated client B", url, key, clientB.token);
    console.log(JSON.stringify({ tables: tables.length, anon, authenticatedA, authenticatedB }, null, 2));
  } finally {
    if (createdEmails.length && env.DRY_RUN_DIRECT_URL) {
      if (createdStorageObjects.length) await prisma.$executeRawUnsafe("DELETE FROM storage.objects WHERE bucket_id = 'project-inspirations' AND name = ANY($1::text[])", createdStorageObjects).catch(() => null);
      await prisma.$executeRawUnsafe("DELETE FROM auth.users WHERE email = ANY($1::text[])", createdEmails).catch(() => null);
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
