/*
 * Full client smoke using a single existing account in COOLINK APP.
 *
 * This deliberately never calls /signup: Supabase Auth rate limiting remains
 * enabled, and the script fails closed unless .env.dryrun.local names the
 * dedicated test project. All records created for the smoke are removed.
 */
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const { loadDryRunEnvironment, requireTestProject } = require("./dryRunTestEnv.cjs");

const prisma = new PrismaClient();
const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const password = process.env.SMOKE_CLIENT_PASSWORD;
const tag = `fixture-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cookieHeader(response) {
  const values = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}

async function call(path, options = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  return { response, body: await response.text() };
}

async function futureFreeRange() {
  const now = new Date();
  for (let day = 18; day <= 110; day += 1) {
    const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, 10, 0, 0));
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const bufferedStart = new Date(startsAt.getTime() - 30 * 60 * 1000);
    const bufferedEnd = new Date(endsAt.getTime() + 30 * 60 * 1000);
    const [appointment, block, googleBusy] = await Promise.all([
      prisma.appointment.findFirst({ where: { status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: bufferedEnd }, endsAt: { gt: bufferedStart } }, select: { id: true } }),
      prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } }),
      prisma.googleCalendarEventSync.findFirst({ where: { appointmentId: null, remoteDeletedAt: null, syncStatus: "SYNCED", calendarEvent: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }, select: { id: true } }),
    ]);
    if (!appointment && !block && !googleBusy) return { startsAt, endsAt };
  }
  throw new Error("Could not find an isolated future free range in the test calendar.");
}

async function futureNonFreeRange() {
  const now = new Date();
  for (let day = 120; day <= 240; day += 1) {
    const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, 10, 0, 0));
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const publishedSlot = await prisma.availableSlot.findFirst({
      where: { isPublic: true, startsAt: { lte: startsAt }, endsAt: { gte: endsAt } },
      select: { id: true },
    });
    if (!publishedSlot) return { startsAt, endsAt };
  }
  throw new Error("Could not find a default non-free range in the test calendar.");
}

async function resetFixturePassword(client) {
  const changed = await prisma.$executeRawUnsafe(
    "UPDATE auth.users SET encrypted_password = crypt($1, gen_salt('bf', 12)), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE id = $2::uuid",
    password,
    client.supabaseUserId,
  );
  assert(changed === 1, "Test fixture password reset did not affect exactly one auth user.");
}

async function main() {
  const dry = loadDryRunEnvironment();
  requireTestProject(dry);
  assert(typeof password === "string" && password.length >= 12, "SMOKE_CLIENT_PASSWORD is required and is not stored in this script.");

  const fixture = await prisma.client.findFirst({
    where: { email: { startsWith: "dryrun-client-" }, supabaseUserId: { not: null } },
    select: { id: true, supabaseUserId: true, email: true, firstName: true, lastName: true, phone: true },
  });
  assert(fixture?.supabaseUserId, "Reusable linked client fixture is missing from the test database.");

  const ids = { projects: [], slots: [], events: [], notifications: [], documents: [], clientB: null };
  try {
    await resetFixturePassword(fixture);
    const login = await call("/api/client/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: fixture.email, password }),
    });
    assert(login.response.status === 200, `fixture login returned ${login.response.status}`);
    const cookie = cookieHeader(login.response);
    assert(cookie.includes("coolink_client_access="), "Fixture login did not establish an access session.");

    // The same cookie must serve the normal client navigation, not just the API.
    for (const path of ["/app/portal", "/app/portal/visits", "/app/portal/calendar", "/app/portal/messages", "/app/portal/documents", "/app/portal/notifications", "/app/portal/profile"]) {
      const page = await call(path, {}, cookie);
      assert(page.response.status === 200, `client route ${path} returned ${page.response.status}`);
    }

    const project = await prisma.tattooProject.create({
      data: {
        clientId: fixture.id,
        title: `Smoke project ${tag}`,
        description: "Kontrolowany projekt smoke testu klienta z pełnym opisem.",
        status: "inquiry",
        estimatedPrice: 4200,
        finalPrice: 4600,
        depositStatus: "awaiting",
        depositAmount: 700,
        internalNotes: `PRIVATE_INTERNAL_${tag}`,
      },
    });
    ids.projects.push(project.id);
    const proposed = await prisma.appointment.create({
      data: { projectId: project.id, startsAt: new Date("2032-05-01T10:00:00.000Z"), endsAt: new Date("2032-05-01T11:00:00.000Z"), status: "proposed", price: 1200 },
    });
    const cancelled = await prisma.appointment.create({
      data: { projectId: project.id, startsAt: new Date("2032-05-02T10:00:00.000Z"), endsAt: new Date("2032-05-02T11:00:00.000Z"), status: "cancelled" },
    });
    await prisma.projectMessage.create({ data: { projectId: project.id, author: "admin", body: `Admin smoke message ${tag}` } });

    const privateEvent = await prisma.calendarEvent.create({
      data: { title: `PRIVATE_GOOGLE_${tag}`, startsAt: new Date("2032-05-03T10:00:00.000Z"), endsAt: new Date("2032-05-03T11:00:00.000Z"), isPublic: false },
    });
    ids.events.push(privateEvent.id);
    const document = await prisma.studioDocument.create({ data: { title: `Smoke document ${tag}`, slug: `smoke-${tag}`, content: "Treść kontrolowanego dokumentu.", published: true } });
    ids.documents.push(document.id);
    const notification = await prisma.clientNotification.create({ data: { clientId: fixture.id, type: "TEST", title: `Smoke notification ${tag}`, body: "Kontrolowane powiadomienie smoke testu.", href: "/app/portal/visits", projectId: project.id, appointmentId: proposed.id } });
    ids.notifications.push(notification.id);

    const profile = await call("/api/client/profile", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: `${fixture.firstName} X`, lastName: fixture.lastName, phone: fixture.phone || "123456789" }),
    }, cookie);
    assert(profile.response.status === 200, `profile update returned ${profile.response.status}`);

    const accept = await call(`/api/client/appointments/${proposed.id}/response`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "accept" }) }, cookie);
    assert(accept.response.status === 200, `appointment accept returned ${accept.response.status}`);
    const ics = await call(`/api/client/appointments/${proposed.id}/calendar`, {}, cookie);
    assert(ics.response.status === 200 && ics.response.headers.get("content-type")?.includes("text/calendar"), "Confirmed appointment ICS was not available.");
    const cancelledIcs = await call(`/api/client/appointments/${cancelled.id}/calendar`, {}, cookie);
    assert(cancelledIcs.response.status === 404, `Cancelled appointment ICS returned ${cancelledIcs.response.status}`);

    const messages = await call(`/api/client/projects/${project.id}/messages`, {}, cookie);
    assert(messages.response.status === 200 && messages.body.includes(`Admin smoke message ${tag}`), "Client message history did not render.");
    const sendMessage = await call(`/api/client/projects/${project.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: `Client smoke reply ${tag}` }) }, cookie);
    assert(sendMessage.response.status === 201, `client message returned ${sendMessage.response.status}`);

    const notifications = await call("/api/client/notifications", {}, cookie);
    assert(notifications.response.status === 200 && notifications.body.includes(`Smoke notification ${tag}`), "Client notification was not listed.");
    const markOne = await call("/api/client/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notification.id }) }, cookie);
    const markAll = await call("/api/client/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "all" }) }, cookie);
    assert(markOne.response.status === 200 && markAll.response.status === 200, "Client notification read actions failed.");

    const acceptDocument = await call(`/api/client/documents/${document.id}/accept`, { method: "POST" }, cookie);
    assert(acceptDocument.response.status === 200, `document acceptance returned ${acceptDocument.response.status}`);

    const projectPage = await call("/app/portal/visits", {}, cookie);
    assert(projectPage.response.status === 200 && projectPage.body.includes(project.title), "Client project detail did not render.");
    assert(projectPage.body.includes("4200") && projectPage.body.includes("700"), "Client project did not render price/deposit data.");
    assert(!projectPage.body.includes(`PRIVATE_INTERNAL_${tag}`), "Client project response exposed internal notes.");
    const documentPage = await call("/app/portal/documents", {}, cookie);
    assert(documentPage.response.status === 200 && documentPage.body.includes(document.title), "Client document preview did not render.");
    const calendarPage = await call("/app/portal/calendar", {}, cookie);
    assert(calendarPage.response.status === 200 && !calendarPage.body.includes(`PRIVATE_GOOGLE_${tag}`), "Client calendar exposed private Google data.");

    const free = await futureFreeRange();
    const slot = await prisma.availableSlot.create({ data: { startsAt: free.startsAt, endsAt: free.endsAt, title: `Free ${tag}`, isPublic: true } });
    ids.slots.push(slot.id);
    const booking = await call("/api/client/appointments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, startsAt: free.startsAt.toISOString(), endsAt: free.endsAt.toISOString(), description: "Kontrolowana prośba o wizytę z jawnie ustawionego wolnego terminu." }),
    }, cookie);
    assert(booking.response.status === 201, `explicit free-slot booking returned ${booking.response.status}`);

    const unavailable = await futureNonFreeRange();
    const noSlotBooking = await call("/api/client/appointments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id, startsAt: unavailable.startsAt.toISOString(), endsAt: unavailable.endsAt.toISOString(), description: "Kontrolowana próba terminu bez jawnie ustawionej dostępności." }),
    }, cookie);
    assert(noSlotBooking.response.status === 409, `default non-free booking returned ${noSlotBooking.response.status}`);

    const clientB = await prisma.client.create({ data: { firstName: "Smoke", lastName: "Isolated", email: `${tag}@example.test` } });
    ids.clientB = clientB.id;
    const foreignProject = await prisma.tattooProject.create({ data: { clientId: clientB.id, title: `Foreign ${tag}`, description: "Prywatny projekt drugiego klienta." } });
    const foreignAppointment = await prisma.appointment.create({ data: { projectId: foreignProject.id, startsAt: new Date("2032-06-01T10:00:00.000Z"), endsAt: new Date("2032-06-01T11:00:00.000Z"), status: "proposed" } });
    const foreignNotification = await prisma.clientNotification.create({ data: { clientId: clientB.id, type: "TEST", title: "Private", body: "Private" } });
    const [foreignMessage, foreignResponse, foreignIcs, foreignRead] = await Promise.all([
      call(`/api/client/projects/${foreignProject.id}/messages`, {}, cookie),
      call(`/api/client/appointments/${foreignAppointment.id}/response`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "accept" }) }, cookie),
      call(`/api/client/appointments/${foreignAppointment.id}/calendar`, {}, cookie),
      call("/api/client/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: foreignNotification.id }) }, cookie),
    ]);
    assert([foreignMessage.response.status, foreignResponse.response.status, foreignIcs.response.status, foreignRead.response.status].every((status) => status === 404), "Client A could access Client B data.");

    const logout = await call("/api/client/auth/logout", { method: "POST" }, cookie);
    assert(logout.response.status === 200, `logout returned ${logout.response.status}`);
    const afterLogout = await call("/api/client/notifications");
    assert(afterLogout.response.status === 401, `logged-out notifications returned ${afterLogout.response.status}`);

    console.log("PASS: existing client fixture auth/session/logout, portal navigation, projects and finance privacy, appointments/ICS, explicit availability, messages, notifications, documents, profile, client A/B isolation and Google privacy.");
  } finally {
    await prisma.client.update({ where: { id: fixture.id }, data: { firstName: fixture.firstName, lastName: fixture.lastName, phone: fixture.phone } }).catch(() => null);
    if (ids.clientB) await prisma.client.delete({ where: { id: ids.clientB } }).catch(() => null);
    await prisma.googleCalendarEventSync.deleteMany({ where: { calendarEventId: { in: ids.events } } }).catch(() => null);
    await prisma.calendarEvent.deleteMany({ where: { id: { in: ids.events } } }).catch(() => null);
    await prisma.availableSlot.deleteMany({ where: { id: { in: ids.slots } } }).catch(() => null);
    await prisma.clientNotification.deleteMany({ where: { id: { in: ids.notifications } } }).catch(() => null);
    await prisma.studioDocument.deleteMany({ where: { id: { in: ids.documents } } }).catch(() => null);
    await prisma.tattooProject.deleteMany({ where: { id: { in: ids.projects } } }).catch(() => null);
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(`FAIL: ${error.message}`);
  await prisma.$disconnect();
  process.exitCode = 1;
});
