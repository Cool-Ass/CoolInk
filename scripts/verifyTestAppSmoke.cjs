/* HTTP smoke test for the local CoolInk server configured only with COOLINK APP. */
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const { loadDryRunEnvironment, requireTestProject } = require("./dryRunTestEnv.cjs");

const prisma = new PrismaClient();
const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
const tag = `after-rls-${Date.now()}-${randomUUID().slice(0, 8)}`;

function assert(condition, message) { if (!condition) throw new Error(message); }
function cookies(response) {
  const values = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}
async function call(path, options = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(cookie ? { cookie } : {}), ...(options.headers || {}) } });
  return { response, body: await response.text() };
}
async function register(label) {
  const email = `${tag}-${label}@example.test`;
  const password = `CoolInk!${randomUUID()}A1`;
  const { response, body } = await call("/api/client/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: `Smoke ${label}`, lastName: "RLS", email, password }) });
  assert(response.status === 200, `registration ${label} returned ${response.status}`);
  let cookie = cookies(response);
  if (!cookie.includes("coolink_client_access=")) {
    // Test project has email confirmation enabled. Confirm only this disposable
    // test account at database level, then verify the normal login endpoint.
    const client = await prisma.client.findUniqueOrThrow({ where: { email } });
    assert(client.supabaseUserId, `registration ${label} did not create an auth user`);
    await prisma.$executeRawUnsafe("UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1::uuid", client.supabaseUserId);
    const login = await call("/api/client/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    assert(login.response.status === 200, `login ${label} after confirmation returned ${login.response.status}`);
    cookie = cookies(login.response);
  }
  assert(cookie.includes("coolink_client_access="), `registration/login ${label} did not establish a session: ${body.slice(0, 200)}`);
  return { email, cookie, body };
}
async function main() {
  const dry = loadDryRunEnvironment(); requireTestProject(dry);
  const homepage = await call("/"); assert(homepage.response.status === 200, "homepage failed");
  const contactOk = await call("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Security smoke", email: `${tag}@example.test`, message: "Wiadomość testowa do sprawdzenia zabezpieczeń." }) });
  assert([201, 429].includes(contactOk.response.status), `contact success returned ${contactOk.response.status}`);
  const contactInvalid = await call("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "x" }) });
  assert([400, 429].includes(contactInvalid.response.status), `contact validation returned ${contactInvalid.response.status}`);
  const contactHoneypot = await call("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "bot", email: `${tag}-bot@example.test`, message: "to nie zostanie zapisane", website: "https://spam.example" }) });
  assert([200, 429].includes(contactHoneypot.response.status), `honeypot returned ${contactHoneypot.response.status}`);
  const foreign = await fetch(`${base}/api/contact`, { method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: JSON.stringify({ name: "x", email: "x@example.test", message: "blocked origin" }) });
  assert(foreign.status === 403, `foreign origin returned ${foreign.status}`);

  const a = await register("a"); const b = await register("b");
  const createA = await call("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "Smoke a", lastName: "RLS", email: a.email, title: "RLS project A", description: "Projekt testowy po migracji RLS." }) }, a.cookie);
  const createB = await call("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "Smoke b", lastName: "RLS", email: b.email, title: "RLS project B", description: "Projekt testowy po migracji RLS." }) }, b.cookie);
  assert(createA.response.status === 201 && createB.response.status === 201, "project creation failed");
  const projectA = JSON.parse(createA.body).projectId; const projectB = JSON.parse(createB.body).projectId;
  const clientA = await prisma.client.findUniqueOrThrow({ where: { email: a.email } });
  const clientB = await prisma.client.findUniqueOrThrow({ where: { email: b.email } });
  const proposedA = await prisma.appointment.create({ data: { projectId: projectA, startsAt: new Date("2030-05-01T10:00:00.000Z"), endsAt: new Date("2030-05-01T11:00:00.000Z"), status: "proposed" } });
  const proposedB = await prisma.appointment.create({ data: { projectId: projectB, startsAt: new Date("2030-05-02T10:00:00.000Z"), endsAt: new Date("2030-05-02T11:00:00.000Z"), status: "proposed" } });
  const cancelledA = await prisma.appointment.create({ data: { projectId: projectA, startsAt: new Date("2030-05-03T10:00:00.000Z"), endsAt: new Date("2030-05-03T11:00:00.000Z"), status: "cancelled" } });
  const unconfirmedA = await prisma.appointment.create({ data: { projectId: projectA, startsAt: new Date("2030-05-04T10:00:00.000Z"), endsAt: new Date("2030-05-04T11:00:00.000Z"), status: "proposed" } });
  const notificationA = await prisma.clientNotification.create({ data: { clientId: clientA.id, type: "TEST", title: "Smoke", body: "test" } });
  const notificationB = await prisma.clientNotification.create({ data: { clientId: clientB.id, type: "TEST", title: "Smoke", body: "test" } });
  const doc = await prisma.studioDocument.create({ data: { title: `Smoke ${tag}`, slug: `smoke-${tag}`, content: "test", published: true } });
  try {
    const profile = await call("/api/client/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ firstName: "Smoke", lastName: "Updated", phone: "123" }) }, a.cookie);
    assert(profile.response.status === 200, `profile returned ${profile.response.status}`);
    const accept = await call(`/api/client/appointments/${proposedA.id}/response`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "accept" }) }, a.cookie);
    assert(accept.response.status === 200, `appointment accept returned ${accept.response.status}`);
    const reject = await call(`/api/client/appointments/${proposedB.id}/response`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "reject" }) }, b.cookie);
    assert(reject.response.status === 200, `appointment reject returned ${reject.response.status}`);
    const foreignResponse = await call(`/api/client/appointments/${proposedB.id}/response`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "accept" }) }, a.cookie);
    assert(foreignResponse.response.status === 404, `foreign appointment response returned ${foreignResponse.response.status}`);
    const markOwn = await call("/api/client/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notificationA.id }) }, a.cookie);
    const markForeign = await call("/api/client/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notificationB.id }) }, a.cookie);
    assert(markOwn.response.status === 200 && markForeign.response.status === 404, "notification ownership check failed");
    const document = await call(`/api/client/documents/${doc.id}/accept`, { method: "POST" }, a.cookie); assert(document.response.status === 200, `document acceptance returned ${document.response.status}`);
    const icsOwn = await call(`/api/client/appointments/${proposedA.id}/calendar`, {}, a.cookie); const icsForeign = await call(`/api/client/appointments/${proposedB.id}/calendar`, {}, a.cookie); const icsCancelled = await call(`/api/client/appointments/${cancelledA.id}/calendar`, {}, a.cookie);
    assert(icsOwn.response.status === 200 && icsOwn.response.headers.get("content-type")?.includes("text/calendar"), "own ICS failed");
    assert(icsForeign.response.status === 404, `foreign ICS returned ${icsForeign.response.status}`);
    assert(icsCancelled.response.status === 404, `cancelled ICS returned ${icsCancelled.response.status}`);
    const portal = await call("/app/portal", {}, a.cookie); assert(portal.response.status === 200, `portal returned ${portal.response.status}`);
    assert(portal.body.includes(`/api/client/appointments/${proposedA.id}/calendar`) && portal.body.includes("calendar.google.com/calendar/render?") && portal.body.includes("ctz=Europe%2FWarsaw"), "confirmed appointment Google Calendar link is missing or has no Warsaw timezone");
    for (const appointment of [cancelledA, unconfirmedA, proposedB]) assert(!portal.body.includes(`/api/client/appointments/${appointment.id}/calendar`), `Google/ICS link was exposed for ${appointment.status} or foreign appointment`);
    console.log("PASS: contact security, client registration/login, profile, projects, proposal accept/reject, notifications, documents, ICS, Google Calendar link restrictions and A/B endpoint isolation.");
  } finally {
    await prisma.$executeRawUnsafe("DELETE FROM auth.users WHERE email = ANY($1::text[])", [a.email, b.email]).catch(() => null);
    await prisma.client.deleteMany({ where: { id: { in: [clientA.id, clientB.id] } } });
    await prisma.studioDocument.delete({ where: { id: doc.id } }).catch(() => null);
    await prisma.$disconnect();
  }
}
main().catch(async (error) => { console.error(`FAIL: ${error.message}`); await prisma.$disconnect(); process.exitCode = 1; });
