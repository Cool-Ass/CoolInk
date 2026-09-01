/*
 * HTTP-level PostgREST regression test. It deliberately accepts only the
 * isolated COOLINK APP project and never logs credentials or response bodies.
 */
const { randomUUID } = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { loadDryRunEnvironment, requireTestProject } = require("./dryRunTestEnv.cjs");

const tables = [
  "AdminUser", "Appointment", "AvailabilityBlock", "Client", "ClientNotification",
  "AvailableSlot", "CalendarEvent",
  "GoogleCalendarConnection", "GoogleCalendarSelection", "GoogleCalendarEventSync",
  "ContactMessage", "DocumentAcceptance", "Media", "NavItem", "Page", "PortfolioItem",
  "ProjectActivity", "ProjectImage", "ProjectMessage", "Promotion", "SiteSetting", "StudioDocument",
  "TattooProject", "WorkingHours", "WorkingHoursOverride",
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

async function signUp(url, key, label) {
  const email = `coolink-security-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `CoolInk!${randomUUID()}A1`;
  const response = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: headers(key), body: JSON.stringify({ email, password }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    throw new Error("Could not create a test client session. In the test project, disable email confirmation temporarily or provide pre-created test accounts through a separate local-only test configuration.");
  }
  return { email, token: data.access_token };
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
  const key = env.DRY_RUN_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Missing DRY_RUN_SUPABASE_PUBLISHABLE_KEY in ignored .env.dryrun.local.");

  const createdEmails = [];
  try {
    const anon = await checkPrincipal("anon", url, key, null);
    const clientA = await signUp(url, key, "a"); createdEmails.push(clientA.email);
    const clientB = await signUp(url, key, "b"); createdEmails.push(clientB.email);
    const authenticatedA = await checkPrincipal("authenticated client A", url, key, clientA.token);
    const authenticatedB = await checkPrincipal("authenticated client B", url, key, clientB.token);
    console.log(JSON.stringify({ tables: tables.length, anon, authenticatedA, authenticatedB }, null, 2));
  } finally {
    if (createdEmails.length && env.DRY_RUN_DIRECT_URL) {
      const previousUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = env.DRY_RUN_DIRECT_URL;
      const prisma = new PrismaClient();
      await prisma.$executeRawUnsafe("DELETE FROM auth.users WHERE email = ANY($1::text[])", createdEmails).catch(() => null);
      await prisma.$disconnect();
      if (previousUrl) process.env.DATABASE_URL = previousUrl; else delete process.env.DATABASE_URL;
    }
  }
}

main().catch((error) => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
