const { test, expect } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { randomUUID, createHmac } = require("node:crypto");
const bcrypt = require("bcryptjs");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("../scripts/dryRunTestEnv.cjs");
const env = loadDryRunEnvironment();
requireTestProject(env);
const prisma = new PrismaClient({ datasources: { db: { url: requireTestDatabase(env) } } });
const email = `browser-${randomUUID()}@example.com`;
const password = `Browser!${randomUUID()}A1`;
let adminId;
let projectTitle;
const blockIds = [];
let slot;
let consent;
let cmsPage;
const announcementIds = [];
const announcementMedia = [];
const mediaLayoutIds = [];
const flashIds = [], flashSlotIds = [];
const campaignIds = [];
const featureAdminIds = [];
const voucherCodes = [];

// Each new feature has an independent disposable operator. Log in through the
// actual form; never reset rate buckets, raise limits or inject session cookies.
async function loginFeatureAdmin(page, role = "owner") {
  const admin = await prisma.adminUser.create({ data: { email: `feature-${randomUUID()}@example.com`, name: "Browser feature fixture", role, passwordHash: await bcrypt.hash(password, 12) } });
  featureAdminIds.push(admin.id);
  await page.goto("http://127.0.0.1:3120/admin/login");
  await page.getByLabel("EMAIL", { exact: true }).fill(admin.email);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  return admin.id;
}

async function verifyCalendarPresentation(page) {
  const monthSwitch = page.getByRole("button", { name: "Miesiąc", exact: true });
  if (await monthSwitch.count()) await monthSwitch.click();
  const day = page.locator('[data-calendar-day="0"]').first();
  await expect(day).toBeVisible();
  await day.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-calendar-day="1"]').first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-calendar-day="8"]').first()).toBeFocused();
  const fits = await day.evaluate((element) => {
    const grid = element.closest(".grid");
    return grid.scrollWidth <= grid.clientWidth + 1 && grid.getBoundingClientRect().right <= innerWidth + 1;
  });
  expect(fits).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const durations = await page.locator(".studio-workspace > :first-child").evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).animationDuration)));
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((duration) => duration < .01)).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

test.beforeAll(async ({ request }) => {
  const admin = await prisma.adminUser.create({ data: { email: `admin-${email}`, name: "Browser fixture", role: "owner", passwordHash: await bcrypt.hash(password, 12) } });
  adminId = admin.id;
  const registration = await request.post("/api/client/auth/register", { headers: { origin: "http://127.0.0.1:3120", "sec-fetch-site": "same-origin" }, data: { email, password, firstName: "Browser", lastName: "Fixture", privacyAcknowledged: true } });
  expect(registration.status()).toBe(200);
  // Confirm only this freshly generated fixture, exclusively in the allowlisted test DB.
  await prisma.$executeRawUnsafe("UPDATE auth.users SET email_confirmed_at = now() WHERE email = $1", email);
  for (const [index, reason] of ["ZAJĘTY · private-browser-note", "Niedostępny"].entries()) {
    const startsAt = new Date(Date.now() + index * 60_000);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60_000);
    const block = await prisma.availabilityBlock.create({ data: { startsAt, endsAt, reason } });
    blockIds.push(block.id);
  }
  const startsAt = new Date(); startsAt.setUTCDate(startsAt.getUTCDate() + 3); startsAt.setUTCHours(10, 0, 0, 0);
  slot = await prisma.availableSlot.create({ data: { startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60_000), isPublic: true, title: "Browser free slot" } });
  consent = await prisma.studioDocument.create({ data: { title: `Browser consent ${email}`, slug: `browser-${randomUUID()}`, content: "<p>Isolated consent fixture.</p>", category: "consent", published: true, version: 1 } });
});

test.afterAll(async () => {
  // Delete actual storage bytes before removing the exact disposable Auth owner.
  // A temporary DELETE policy applies only to this test UUID in the allowlisted DB.
  const fixture = await prisma.client.findUnique({ where: { email }, include: { projects: { include: { images: true } } } });
  const objects = fixture?.projects.flatMap((project) => project.images.map((image) => image.url)) ?? [];
  if (objects.length) {
    const owner = fixture.supabaseUserId;
    if (!/^[a-f0-9-]{36}$/.test(owner) || objects.some((path) => !path.startsWith(`${owner}/`))) throw new Error("Unsafe browser media cleanup target");
    const policy = `browser_cleanup_${randomUUID().replaceAll("-", "")}`;
    const url = requireTestProject(env);
    const key = env.DRY_RUN_SUPABASE_PUBLISHABLE_KEY;
    const login = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const session = await login.json();
    if (!login.ok || !session.access_token) throw new Error("Could not authenticate disposable media cleanup owner");
    await prisma.$executeRawUnsafe(`CREATE POLICY "${policy}" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-inspirations' AND auth.uid() = '${owner}'::uuid)`);
    try {
      const removed = await fetch(`${url}/storage/v1/object/project-inspirations`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: objects }) });
      expect(removed.ok).toBe(true);
      const remaining = await prisma.$queryRawUnsafe("SELECT count(*)::int AS count FROM storage.objects WHERE bucket_id = 'project-inspirations' AND name = ANY($1::text[])", objects);
      expect(remaining[0].count).toBe(0);
    } finally { await prisma.$executeRawUnsafe(`DROP POLICY "${policy}" ON storage.objects`); }
  }
  await prisma.availabilityBlock.deleteMany({ where: { id: { in: blockIds } } });
  await prisma.media.deleteMany({ where: { id: { in: mediaLayoutIds } } });
  if (fixture) await prisma.tattooProject.updateMany({ where: { clientId: fixture.id }, data: { depositAssignedAppointmentId: null } });
  if (fixture && await prisma.voucher.count({ where: { clientId: fixture.id } })) await prisma.$transaction(async tx => {
    const existingRequest = await tx.accountDeletionRequest.findUnique({ where: { clientId: fixture.id } });
    const requestId = existingRequest?.id ?? "browser-voucher-cleanup-" + randomUUID();
    await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', ${requestId}, true)`;
    await tx.accountDeletionRequest.upsert({ where: { clientId: fixture.id }, create: { id: requestId, clientId: fixture.id, status: "executing" }, update: { status: "executing" } });
    await tx.voucher.deleteMany({ where: { clientId: fixture.id, code: { in: voucherCodes } } });
    await tx.accountDeletionRequest.delete({ where: { id: requestId } });
  }, { maxWait: 10000, timeout: 30000 });
  await prisma.voucher.deleteMany({ where: { code: { in: voucherCodes }, clientId: null, redeemedAt: null } });
  await prisma.client.deleteMany({ where: { email } });
  await prisma.promotion.deleteMany({ where: { id: { in: campaignIds } } });
  await prisma.portfolioItem.deleteMany({ where: { id: { in: flashIds } } });
  await prisma.availableSlot.deleteMany({ where: { id: { in: flashSlotIds } } });
  for (const id of announcementIds) {
    await prisma.clientNotification.deleteMany({ where: { type: { in: [`announcement:${id}`, `announcement-dismissed:${id}`] } } });
    await prisma.siteSetting.deleteMany({ where: { key: `client-announcement:${id}` } });
  }
  await prisma.$executeRawUnsafe("DELETE FROM auth.users WHERE email = $1", email);
  for (const media of announcementMedia) {
    await prisma.media.deleteMany({ where: { id: media.id } });
    if (!/^\/uploads\/[a-f0-9-]+\.webp$/.test(media.url)) throw new Error("Expected isolated local announcement upload");
    await require("node:fs/promises").unlink(require("node:path").join(process.cwd(), "public", media.url)).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
  await prisma.contactMessage.deleteMany({ where: { email } });
  if (slot) await prisma.availableSlot.delete({ where: { id: slot.id } });
  if (consent) await prisma.studioDocument.delete({ where: { id: consent.id } });
  if (cmsPage) await prisma.page.delete({ where: { id: cmsPage.id } });
  await prisma.adminUser.deleteMany({ where: { id: { in: featureAdminIds } } });
  if (adminId) await prisma.adminUser.delete({ where: { id: adminId } });
  await prisma.$disconnect();
});

test("client login, own project navigation and logout", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("E-MAIL", { exact: true }).fill(email);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/portal/);
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  projectTitle = `Browser project ${randomUUID().slice(0, 8)}`;
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: projectTitle, description: "Isolated browser fixture" } });
  const depositVisit = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date("2030-01-08T10:00:00Z"), endsAt: new Date("2030-01-08T11:00:00Z"), status: "confirmed", depositStatus: "awaiting", depositAmount: 300 } });
  const sibling = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date("2030-01-09T10:00:00Z"), endsAt: new Date("2030-01-09T11:00:00Z"), status: "confirmed", depositStatus: "paid", depositAmount: 500 } });
  await page.goto("/app/portal");
  const blik = page.getByRole("region", { name: "Zadatek BLIK na telefon", exact: true });
  await expect(blik).toBeVisible();
  await expect(blik.getByText("530 178 346", { exact: true })).toBeVisible();
  await expect(blik.getByText("300 zł", { exact: true })).toBeVisible();
  await expect(blik.getByText(`Zadatek ${depositVisit.id}`, { exact: true })).toBeVisible();
  // Mock only the clipboard in this isolated browser document, never banking/payment APIs.
  await page.evaluate(() => { window.__blikCopied = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.__blikCopied.push(value); } } }); });
  for (const label of ["Numer telefonu", "Kwota zadatku", "Tytuł przelewu"]) {
    await blik.getByRole("button", { name: `Kopiuj: ${label}`, exact: true }).click();
    await expect(blik.getByRole("status")).toHaveText(`${label} — skopiowano.`);
  }
  expect(await page.evaluate(() => window.__blikCopied)).toEqual(["530178346", "300", `Zadatek ${depositVisit.id}`]);
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Clipboard denied fixture"); } } }); });
  await blik.getByRole("button", { name: "Kopiuj: Numer telefonu", exact: true }).click();
  await expect(blik.getByRole("status")).toHaveText("Nie udało się skopiować. Przepisz dane widoczne powyżej.");
  expect((await prisma.appointment.findUniqueOrThrow({ where: { id: depositVisit.id } })).depositStatus).toBe("awaiting");
  expect((await prisma.appointment.findUniqueOrThrow({ where: { id: sibling.id } })).depositStatus).toBe("paid");
  await page.goto(`/app/portal/projects?project=${project.id}&appointment=${depositVisit.id}`);
  await expect(blik).toBeVisible();
  expect(await blik.getByRole("heading", { level: 4 }).allTextContents()).toEqual(["Gotówka w studiu", "Przelew BLIK na telefon"]);
  await prisma.appointment.update({ where: { id: depositVisit.id }, data: { depositStatus: "paid" } });
  await page.reload();
  await expect(blik).toHaveCount(0);
  await page.goto("/app/portal");
  await expect(blik).toHaveCount(0);
  // Restore this test fixture for the existing project flow; no real transfer is executed.
  await prisma.tattooProject.update({ where: { id: project.id }, data: { depositStatus: "not_required", depositAmount: null } });
  await page.goto("/app/portal/projects");
  await expect(page.getByText(projectTitle, { exact: true }).first()).toBeVisible();
  await page.goto(`/app/portal/projects?project=${project.id}`);
  // Measure authenticated chat reads without persisting bodies, IDs or sessions.
  // This is an isolated CI baseline, not a claim about production latency.
  const chatLatency = await page.evaluate(async (projectId) => {
    const samples = [];
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      const response = await fetch(`/api/client/projects/${projectId}/messages`, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("Chat read measurement failed");
      await response.arrayBuffer();
      samples.push(performance.now() - started);
    }
    samples.sort((a, b) => a - b);
    return { samples: samples.length, p95Ms: Math.round(samples[Math.ceil(samples.length * 0.95) - 1]) };
  }, project.id);
  test.info().annotations.push({ type: "chat-p95-isolated", description: JSON.stringify(chatLatency) });
  console.log("Isolated chat read baseline", { device: test.info().project.name, ...chatLatency });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "DODAJ INSPIRACJĘ", exact: true }).click();
  const uploaded = page.waitForResponse((response) => response.url().endsWith(`/api/client/projects/${project.id}/images`) && response.request().method() === "POST");
  await (await chooser).setFiles({ name: "browser-inspiration.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
  const upload = await uploaded;
  expect(upload.status()).toBe(201);
  const image = (await upload.json()).image;
  const renderedImage = page.locator(`img[src="${image.url}"]`).first();
  await expect(renderedImage).toBeVisible();
  await expect.poll(async () => renderedImage.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  const outsider = await page.context().browser().newContext();
  try { expect((await outsider.request.get(`http://127.0.0.1:3120${image.url}`)).status()).toBe(401); }
  finally { await outsider.close(); }
  const denied = await page.request.get("/api/admin/google-calendar/calendars");
  expect([401, 403]).toContain(denied.status());
  await page.goto("/app/portal/calendar");
  await expect(page.getByText("ZAJĘTY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NIEDOSTĘPNY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("private-browser-note", { exact: false })).toHaveCount(0);
  await verifyCalendarPresentation(page);
  // Exercise all four reservation steps through the actual responsive UI.
  await page.goto(`/app/portal/calendar?booking=${encodeURIComponent(slot.startsAt.toISOString())}`);
  const bookingDialog = page.getByRole("dialog").last();
  await bookingDialog.focus();
  await page.keyboard.press("Shift+Tab");
  expect(await bookingDialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.getByLabel("NAZWA / KRÓTKI TEMAT (OPCJONALNIE)", { exact: true }).fill("Browser booked project");
  await page.getByLabel("OPIS / POMYSŁ", { exact: true }).fill("A complete isolated browser booking scenario.");
  await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  await page.getByRole("checkbox", { name: new RegExp(consent.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).check();
  await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  await page.getByRole("checkbox", { name: "Potwierdzam poprawność projektu, terminu i zaakceptowanych wersji zgód.", exact: true }).check();
  const bookedResponse = page.waitForResponse((response) => response.url().endsWith("/api/client/appointments") && response.request().method() === "POST");
  await page.getByRole("button", { name: "WYŚLIJ PROŚBĘ O WIZYTĘ", exact: true }).click();
  const booked = await bookedResponse;
  const booking = await booked.json().catch(() => ({ errorCode: "BOOKING_NON_JSON_RESPONSE" }));
  expect(booked.status(), booking.errorCode || "BOOKING_HTTP_STATUS").toBe(201);
  await page.goto(`/app/portal/projects?project=${booking.projectId}&appointment=${booking.appointment.id}`);
  await page.getByRole("button", { name: "ANULUJ TĘ WIZYTĘ", exact: true }).click();
  await page.getByRole("dialog", { name: "Potwierdź akcję", exact: true }).getByRole("button", { name: "Potwierdź", exact: true }).click();
  await expect.poll(async () => (await prisma.appointment.findUniqueOrThrow({ where: { id: booking.appointment.id } })).status).toBe("cancelled");
  await prisma.tattooProject.update({ where: { id: booking.projectId }, data: { clientArchivedAt: new Date() } });
  const archivedBooking = await page.evaluate(async (body) => {
    const response = await fetch("/api/client/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { projectId: booking.projectId, startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString(), confirmationAcknowledged: true, consents: [{ id: consent.id, version: 1 }] });
  expect(archivedBooking.status).toBe(409);
  expect(archivedBooking.body.error).toContain("archiwum");
  await page.goto("/app/portal/projects");
  await expect(page.getByText("Browser booked project", { exact: true })).toHaveCount(0);
  if (test.info().project.name === "mobile") await page.getByRole("button", { name: "WIĘCEJ", exact: true }).click();
  await page.getByRole("button", { name: "WYLOGUJ", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/portal/projects");
  await expect(page).toHaveURL(/\/app(?:\?|$)/);
});

test("waitlist concurrent offers, acceptance, leaving and archived project safety", async ({ page, browser }) => {
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Waitlist race fixture", description: "Disposable isolated waitlist regression" } });
  const entry = await prisma.waitlistEntry.create({ data: { clientId: client.id, projectId: project.id, durationMinutes: 60 } });
  const slots = [];
  const context = await browser.newContext();
  try {
    for (let day = 1; day <= 4; day++) {
      const startsAt = new Date(`2032-01-0${day}T10:00:00Z`);
      slots.push(await prisma.availableSlot.create({ data: { startsAt, endsAt: new Date(+startsAt + 60 * 60_000), isPublic: true, title: "Waitlist isolated free slot" } }));
    }
    await page.goto("/admin/login");
    await page.getByLabel("EMAIL", { exact: true }).fill(`admin-${email}`);
    await page.getByLabel("HASŁO", { exact: true }).fill(password);
    await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    const statuses = await page.evaluate(async ({ id, starts }) => Promise.all(starts.map(async startsAt => {
      const response = await fetch(`/api/admin/waitlist/${id}/offer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt, durationMinutes: 60 }) });
      return response.status;
    })), { id: entry.id, starts: slots.map(item => item.startsAt.toISOString()) });
    expect(statuses.sort()).toEqual([201, 409, 409, 409]);
    const offered = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(await prisma.appointment.count({ where: { projectId: project.id } })).toBe(1);
    expect(offered.status).toBe("offered");
    expect(offered.offeredAppointmentId).toBeTruthy();

    const clientPage = await context.newPage();
    await clientPage.goto("http://127.0.0.1:3120/app");
    await clientPage.getByLabel("E-MAIL", { exact: true }).fill(email);
    await clientPage.getByLabel("HASŁO", { exact: true }).fill(password);
    await clientPage.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
    await expect(clientPage).toHaveURL(/\/app\/portal/);
    const accepted = await clientPage.evaluate(async id => (await fetch(`/api/client/appointments/${id}/response`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response: "accept" }) })).status, offered.offeredAppointmentId);
    expect(accepted).toBe(200);
    expect((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } })).status).toBe("booked");
    const left = await clientPage.evaluate(async id => (await fetch("/api/client/waitlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })).status, entry.id);
    expect(left).toBe(200);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: offered.offeredAppointmentId } })).status).toBe("confirmed");

    await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: "active" } });
    await prisma.tattooProject.update({ where: { id: project.id }, data: { clientArchivedAt: new Date() } });
    const archived = await page.evaluate(async ({ id, startsAt }) => (await fetch(`/api/admin/waitlist/${id}/offer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startsAt, durationMinutes: 60 }) })).status, { id: entry.id, startsAt: slots[1].startsAt.toISOString() });
    expect(archived).toBe(409);
    expect(await prisma.appointment.count({ where: { projectId: project.id } })).toBe(1);
  } catch (error) {
    // Only fixed Prisma error codes may leave the server log; never log its
    // contents, request bodies, session credentials or customer records.
    const log = await require("node:fs/promises").readFile("/tmp/coolink-app.log", "utf8").catch(() => "");
    console.error("Waitlist server error codes", [...new Set(log.match(/\bP\d{4}\b/g) || [])]);
    throw error;
  } finally {
    await context.close();
    await prisma.tattooProject.delete({ where: { id: project.id } });
    await prisma.availableSlot.deleteMany({ where: { id: { in: slots.map(item => item.id) } } });
  }
});

test("visit deposits, explicit legacy assignment and editable client instructions", async ({ page, browser }) => {
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Visit deposit fixture", description: "Disposable isolated payment instructions", depositStatus: "paid", depositAmount: 250, depositPaidAt: new Date("2026-10-01T10:00:00Z"), depositPaymentMethod: "gotówka" } });
  const first = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date("2030-02-08T10:00:00Z"), endsAt: new Date("2030-02-08T11:00:00Z"), status: "confirmed" } });
  const second = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date("2030-02-09T10:00:00Z"), endsAt: new Date("2030-02-09T11:00:00Z"), status: "confirmed" } });
  await page.goto("/admin/login");
  await page.getByLabel("EMAIL", { exact: true }).fill(`admin-${email}`);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/calendar?appointment=${first.id}`);
  await page.getByRole("button", { name: "Zakończ / rozlicz", exact: true }).click();
  await page.getByRole("button", { name: "Przypisz do tej wizyty", exact: true }).click();
  await page.getByRole("dialog", { name: "Potwierdź akcję", exact: true }).getByRole("button", { name: "Potwierdź", exact: true }).click();
  await expect.poll(async () => (await prisma.tattooProject.findUniqueOrThrow({ where: { id: project.id } })).depositAssignedAppointmentId).toBe(first.id);
  expect((await prisma.appointment.findUniqueOrThrow({ where: { id: first.id } })).depositStatus).toBe("paid");
  await page.goto(`/admin/calendar?appointment=${second.id}`);
  await page.getByRole("button", { name: "Zakończ / rozlicz", exact: true }).click();
  await page.getByLabel("Status zadatku", { exact: true }).selectOption("awaiting");
  await page.getByLabel("Kwota (zł)", { exact: true }).fill("200");
  await page.getByLabel("Metoda płatności", { exact: true }).fill("BLIK");
  await page.getByRole("button", { name: "Zapisz zadatek", exact: true }).click();
  await page.getByRole("dialog", { name: "Potwierdź akcję", exact: true }).getByRole("button", { name: "Potwierdź", exact: true }).click();
  await expect.poll(async () => (await prisma.appointment.findUniqueOrThrow({ where: { id: second.id } })).depositAmount).toBe(200);
  expect((await prisma.appointment.findUniqueOrThrow({ where: { id: first.id } })).depositAmount).toBe(250);
  const original = await prisma.siteSetting.findUnique({ where: { key: "deposit_instructions" } });
  const context = await browser.newContext();
  try {
    await page.goto("/admin/settings?category=payments");
    await page.locator("summary").filter({ hasText: /^ZADATKI/ }).click();
    // The wrapping label includes the SSR textarea value in its text content.
    // Match the stable label prefix, not the editable initial instructions.
    await page.getByLabel(/^Instrukcja BLIK/).fill("Instrukcja testowa: sprawdź numer i kwotę.");
    await page.getByLabel("Pokaż gotówkę w studiu", { exact: true }).uncheck();
    const preview = page.getByRole("region", { name: "Zadatek BLIK na telefon", exact: true });
    await expect(preview.getByText("Instrukcja testowa: sprawdź numer i kwotę.", { exact: true })).toBeVisible();
    await expect(preview.getByRole("heading", { name: "Gotówka w studiu", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Zapisz instrukcje", exact: true }).click();
    await page.getByRole("dialog", { name: "Potwierdź akcję", exact: true }).getByRole("button", { name: "Potwierdź", exact: true }).click();
    await expect(page.getByText("Instrukcje zapisane. Są widoczne klientom przy zadatkach wizyt.", { exact: true })).toBeVisible();
    const customer = await context.newPage();
    await customer.goto("http://127.0.0.1:3120/app");
    await customer.getByLabel("E-MAIL", { exact: true }).fill(email);
    await customer.getByLabel("HASŁO", { exact: true }).fill(password);
    await customer.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
    await expect(customer).toHaveURL(/\/app\/portal/);
    await customer.goto(`http://127.0.0.1:3120/app/portal/projects?project=${project.id}&appointment=${second.id}`);
    const payment = customer.getByRole("region", { name: "Zadatek BLIK na telefon", exact: true });
    await expect(payment.getByText("200 zł", { exact: true })).toBeVisible();
    await expect(payment.getByText("Instrukcja testowa: sprawdź numer i kwotę.", { exact: true })).toBeVisible();
    await expect(payment.getByRole("heading", { name: "Gotówka w studiu", exact: true })).toHaveCount(0);
    expect(await customer.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const forbidden = await customer.request.patch(`http://127.0.0.1:3120/api/admin/appointments/${second.id}/deposit`, { headers: { origin: "http://127.0.0.1:3120" }, data: { status: "paid", amount: 200, paymentMethod: "BLIK", expectedUpdatedAt: second.updatedAt.toISOString() } });
    expect([401, 403]).toContain(forbidden.status());
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: second.id } })).depositStatus).toBe("awaiting");
  } finally {
    await context.close();
    if (original) await prisma.siteSetting.upsert({ where: { key: original.key }, create: { key: original.key, value: original.value }, update: { value: original.value } });
    else await prisma.siteSetting.deleteMany({ where: { key: "deposit_instructions" } });
  }
});

test("Flash gallery, booking, visit deposit and unique concurrent claims", async ({ page }) => {
  const when = new Date(); when.setUTCDate(when.getUTCDate() + 30); when.setUTCHours(10, 0, 0, 0);
  const flash = await prisma.portfolioItem.create({ data: { title: `Flash ${randomUUID()}`, description: "Gotowy wzór testowy Flash", imageUrl: "/images/logo-white.jpg", published: true, flashEnabled: true, flashUnique: true, flashPrice: 700, flashSize: "10 cm", flashDurationMinutes: 60, flashDepositAmount: 100 } });
  flashIds.push(flash.id);
  const ranges = [];
  for (let day = 0; day < 4; day++) {
    const startsAt = new Date(when.getTime() + day * 86400000), endsAt = new Date(startsAt.getTime() + 3600000);
    const free = await prisma.availableSlot.create({ data: { startsAt, endsAt, isPublic: true, title: "Flash fixture" } }); flashSlotIds.push(free.id); ranges.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
  }
  await page.goto("/app"); await page.getByLabel("E-MAIL", { exact: true }).fill(email); await page.getByLabel("HASŁO", { exact: true }).fill(password); await page.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click(); await expect(page).toHaveURL(/\/app\/portal/);
  await page.goto("/app/portal/flash"); await expect(page.getByRole("heading", { name: flash.title, exact: true })).toBeVisible();
  await page.getByRole("heading", { name: flash.title, exact: true }).locator("xpath=../..").getByRole("link", { name: "Wybierz termin", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`flash=${flash.id}`));
  // The actual four-step booking form is shared with normal appointments.
  await page.goto(`/app/portal/calendar?flash=${flash.id}`);
  const consentVersions = (await prisma.studioDocument.findMany({ where: { published: true, category: "consent" }, select: { id: true, version: true } })).map(item => ({ ...item, answers: {} }));
  const claims = await page.evaluate(async ({ ranges, flash, consents }) => Promise.all(ranges.map(async range => {
    const response = await fetch("/api/client/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...range, flashId: flash.id, flashUpdatedAt: flash.updatedAt, confirmationAcknowledged: true, consents, description: "Wybrany gotowy wzór Flash", price: 1, depositAmount: 1 }) });
    return { status: response.status, data: await response.json() };
  })), { ranges, flash: { id: flash.id, updatedAt: flash.updatedAt.toISOString() }, consents: consentVersions });
  expect(claims.map(result => result.status).sort()).toEqual([201, 409, 409, 409]);
  const booked = claims.find(result => result.status === 201).data;
  expect(await prisma.tattooProject.count({ where: { flashPortfolioId: flash.id } })).toBe(1);
  const visit = await prisma.appointment.findUniqueOrThrow({ where: { id: booked.appointment.id } });
  expect(visit.price).toBe(700); expect(visit.depositAmount).toBe(100); expect(visit.depositStatus).toBe("awaiting");
  await page.goto(`/app/portal/projects?project=${booked.projectId}&appointment=${visit.id}`);
  await expect(page.getByRole("region", { name: "Zadatek BLIK na telefon", exact: true }).getByText("100 zł", { exact: true })).toBeVisible();
  await page.goto("/app/portal/flash"); await expect(page.getByRole("heading", { name: flash.title, exact: true })).toHaveCount(0);
  // A cancelled project label cannot make an already used unique design bookable.
  await prisma.appointment.update({ where: { id: visit.id }, data: { status: "completed" } });
  await prisma.tattooProject.update({ where: { id: booked.projectId }, data: { status: "cancelled" } });
  await page.reload(); await expect(page.getByRole("heading", { name: flash.title, exact: true })).toHaveCount(0);
  // Restore only this disposable fixture before testing other independent flows.
  await prisma.tattooProject.update({ where: { id: booked.projectId }, data: { status: "awaiting_confirmation" } });
  await prisma.appointment.update({ where: { id: visit.id }, data: { status: "requested" } });
  const uiFlash = await prisma.portfolioItem.create({ data: { title: `UI Flash ${randomUUID()}`, description: "Gotowy wzór rezerwowany w kreatorze", imageUrl: "/images/logo-white.jpg", published: true, flashEnabled: true, flashUnique: true, flashPrice: 600, flashSize: "8 cm", flashDurationMinutes: 60 } }); flashIds.push(uiFlash.id);
  const uiStart = new Date(when.getTime() + 5 * 86400000);
  const uiSlot = await prisma.availableSlot.create({ data: { startsAt: uiStart, endsAt: new Date(uiStart.getTime() + 3600000), isPublic: true, title: "Flash UI fixture" } }); flashSlotIds.push(uiSlot.id);
  await page.goto(`/app/portal/calendar?flash=${uiFlash.id}&booking=${encodeURIComponent(uiStart.toISOString())}`);
  await expect(page.getByRole("region", { name: "Wybrany wzór Flash", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  const required = page.getByRole("dialog", { name: "Umów wizytę", exact: true }).getByRole("group", { name: "WYMAGANE ZGODY", exact: true });
  if (await required.count()) {
    for (const checkbox of await required.getByRole("checkbox").all()) if (await checkbox.isEnabled() && !await checkbox.isChecked()) await checkbox.check();
    await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  }
  await expect(page.getByRole("list", { name: "Etapy rezerwacji" })).not.toContainText("TERMIN");
  await page.getByRole("checkbox", { name: "Potwierdzam poprawność projektu, terminu i zaakceptowanych wersji zgód.", exact: true }).check();
  const created = page.waitForResponse(response => response.url().endsWith("/api/client/appointments") && response.request().method() === "POST");
  await page.getByRole("button", { name: "WYŚLIJ PROŚBĘ O WIZYTĘ", exact: true }).click(); expect((await created).status()).toBe(201);
  expect(await prisma.tattooProject.count({ where: { flashPortfolioId: uiFlash.id } })).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("business reports execute historical return, hourly receipts, promotion attribution and forecasts", async ({ page }) => {
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Report fixture", description: "Isolated business reporting" } });
  const startsAt = new Date(Date.now() - 10 * 86400000), endsAt = new Date(startsAt.getTime() + 7200000);
  const promotion = await prisma.promotion.create({ data: { title: `Report promotion ${randomUUID()}`, startsAt, endsAt, active: false, isPublic: false } }); campaignIds.push(promotion.id);
  const visit = await prisma.appointment.create({ data: { projectId: project.id, promotionId: promotion.id, startsAt, endsAt, status: "completed", price: 1400 } });
  await prisma.loyaltyEntry.create({ data: { appointmentId: visit.id, clientId: client.id, key: `report-${randomUUID()}`, kind: "visit", stamps: 0, paidCents: 140000, grossCents: 140000, note: "Disposable reporting fixture", adminId } });
  const old = new Date(Date.now() - 200 * 86400000);
  await prisma.appointment.create({ data: { projectId: project.id, startsAt: old, endsAt: new Date(old.getTime() + 7200000), status: "completed" } });
  const future = new Date(Date.now() + 20 * 86400000);
  await prisma.appointment.create({ data: { projectId: project.id, startsAt: future, endsAt: new Date(future.getTime() + 7200000), status: "confirmed", price: 1400, depositStatus: "paid", depositAmount: 300 } });
  await loginFeatureAdmin(page);
  await page.goto("/admin/statistics?period=90"); await expect(page.getByRole("heading", { name: "Statystyki operacyjne", exact: true })).toBeVisible();
  await expect(page.getByText("WPŁYW NA GODZINĘ SESJI", { exact: true })).toBeVisible(); await expect(page.getByText("PROGNOZA DOPŁAT · 30 DNI", { exact: true })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: promotion.title }); await expect(row).toContainText("100%"); await expect(row).toContainText(/1\s?400/);
});

test("marketing prepares editable dated campaigns and approval never publishes or broadcasts", async ({ page }) => {
  const startsAt = new Date(); startsAt.setUTCDate(startsAt.getUTCDate() + 55); startsAt.setUTCHours(10, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 7200000);
  const free = await prisma.availableSlot.create({ data: { startsAt, endsAt, isPublic: true, title: "Marketing fixture" } }); flashSlotIds.push(free.id);
  const operatorId = await loginFeatureAdmin(page);
  await page.goto("/admin/marketing");
  const timezone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  // Browser context timezone is used for datetime-local, not the worker's zone.
  const inputDate = value => new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value).replace(" ", "T");
  await page.getByLabel("Tytuł oferty", { exact: true }).fill("Marketing isolated campaign");
  await page.getByLabel("Początek terminu", { exact: true }).fill(inputDate(startsAt)); await page.getByLabel("Koniec terminu", { exact: true }).fill(inputDate(endsAt)); await page.getByLabel("Proponowany rabat (%)", { exact: true }).fill("10");
  await page.getByRole("button", { name: "Wygeneruj i zapisz szkic kampanii", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Nic nie opublikowano");
  const campaign = await prisma.promotion.findFirstOrThrow({ where: { title: "Marketing isolated campaign" } }); campaignIds.push(campaign.id); expect(campaign.campaignStatus).toBe("draft"); expect(campaign.active).toBe(false); expect(campaign.isPublic).toBe(false);
  await page.getByRole("button", { name: "Edytuj szkic", exact: true }).click(); await page.getByLabel("Treść promocji", { exact: true }).fill("Zredagowany post testowy"); await page.getByRole("button", { name: "Zapisz zmiany szkicu", exact: true }).click(); await expect.poll(async () => (await prisma.promotion.findUniqueOrThrow({ where: { id: campaign.id } })).campaignCaption).toBe("Zredagowany post testowy");
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Zatwierdź bez publikacji", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Zatwierdzono");
  const approved = await prisma.promotion.findUniqueOrThrow({ where: { id: campaign.id } }); expect(approved.campaignStatus).toBe("approved"); expect(approved.active).toBe(false); expect(approved.isPublic).toBe(false); expect(approved.campaignApprovedBy).toBe(operatorId);
  expect(await prisma.clientNotification.count({ where: { type: { contains: campaign.id } } })).toBe(0);
});

test("assistant tools persist private drafts without delivering client messages", async ({ page }) => {
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Assistant isolated fixture", description: "Unsent draft test" } });
  const before = await prisma.projectMessage.count({ where: { projectId: project.id } });
  const operatorId = await loginFeatureAdmin(page);
  await page.goto("/admin/assistant"); await expect(page.getByRole("heading", { name: "Asystent AI", exact: true })).toBeVisible();
  await page.getByLabel("Narzędzie", { exact: true }).selectOption("message_draft"); await page.getByLabel("ID projektu", { exact: true }).fill(project.id); await page.getByRole("button", { name: "Uruchom narzędzie", exact: true }).click();
  await expect(page.getByLabel("Szkic — sprawdź przed użyciem", { exact: true })).toHaveValue(/Assistant isolated fixture/);
  await page.getByRole("button", { name: "Zapisz szkic bez wysyłania", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Nic nie wysłano");
  expect(await prisma.assistantDraft.count({ where: { projectId: project.id, adminUserId: operatorId } })).toBe(1); expect(await prisma.projectMessage.count({ where: { projectId: project.id } })).toBe(before);
  await page.reload(); await expect(page.getByText(project.title, { exact: true })).toBeVisible();
});

test("session consents support handwritten signatures, immutable PDFs and appointment ownership", async ({ page, browser }) => {
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Signature fixture", description: "Isolated consent flow" } });
  const startsAt = new Date(Date.now() + 45 * 86400000);
  const visit = await prisma.appointment.create({ data: { projectId: project.id, startsAt, endsAt: new Date(startsAt.getTime() + 3600000), status: "confirmed" } });
  await page.goto("/app"); await page.getByLabel("E-MAIL", { exact: true }).fill(email); await page.getByLabel("HASŁO", { exact: true }).fill(password); await page.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click(); await expect(page).toHaveURL(/\/app\/portal/);
  await page.goto(`/app/portal/documents?appointment=${visit.id}`);
  await page.getByRole("button").filter({ hasText: consent.title }).click();
  const pad = page.getByLabel("Pole podpisu odręcznego"), box = await pad.boundingBox(); expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width * .1, box.y + box.height * .4); await page.mouse.down(); await page.mouse.move(box.x + box.width * .3, box.y + box.height * .7, { steps: 8 }); await page.mouse.move(box.x + box.width * .6, box.y + box.height * .2, { steps: 8 }); await page.mouse.up();
  await page.getByLabel("Potwierdzam przeczytanie dokumentu", { exact: false }).check();
  const saved = page.waitForResponse(response => response.url().includes(`/documents/${consent.id}/sign`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "PRZECZYTAŁEM(-AM) I AKCEPTUJĘ", exact: true }).click(); expect((await saved).status()).toBe(201);
  const signature = await prisma.sessionDocumentSignature.findFirstOrThrow({ where: { appointmentId: visit.id, clientId: client.id } });
  // Use the real browser download. APIRequestContext does not share Chromium's
  // localhost exception for Secure session cookies on the isolated HTTP server.
  await page.getByText(/Archiwum podpisanych zgód ·/).click();
  const pdfResponse = page.waitForResponse(response => response.url().endsWith(`/api/client/documents/signatures/${signature.id}/pdf`));
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Pobierz PDF", exact: true }).click();
  const pdf = await pdfResponse; expect(pdf.status()).toBe(200); expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const pdfPath = await (await download).path(); expect(pdfPath).toBeTruthy();
  expect((await require("node:fs/promises").readFile(pdfPath)).subarray(0, 4).toString()).toBe("%PDF");
  const outsider = await browser.newContext(); const denied = await outsider.request.get(`http://127.0.0.1:3120/api/client/documents/signatures/${signature.id}/pdf`); expect(denied.status()).toBe(401); await outsider.close();
  const staff = await browser.newContext();
  try {
    const admin = await staff.newPage(); await loginFeatureAdmin(admin);
    await admin.goto(`http://127.0.0.1:3120/admin/appointments/${visit.id}/documents`);
    await expect(admin.getByRole("heading", { name: "Dokumenty kompletne", exact: true })).toBeVisible();
    const qr = admin.getByRole("img", { name: "Kod QR formularza tej sesji", exact: true }); await expect(qr).toBeVisible(); await expect.poll(() => qr.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
    const target = new URL(await admin.getByRole("link", { name: "Otwórz formularz klienta", exact: true }).getAttribute("href")); expect(target.pathname).toBe("/app/portal/documents"); expect(target.searchParams.get("appointment")).toBe(visit.id);
  } finally { await staff.close(); }
  await expect(prisma.sessionDocumentSignature.update({ where: { id: signature.id }, data: { signature: "tampered" } })).rejects.toThrow();
  await prisma.appointment.delete({ where: { id: visit.id } });
  const archived = await prisma.sessionDocumentSignature.findUniqueOrThrow({ where: { id: signature.id } }); expect(archived.appointmentId).toBeNull(); expect(JSON.parse(archived.snapshot).appointmentId).toBe(visit.id); expect(archived.digest).toBe(signature.digest);
});

test("aftercare starts on completion, notifies once, stores private healing photos and requests consultation", async ({ page, browser }) => {
  if (!process.env.CRON_SECRET) throw Error("Isolated runtime cron credential required");
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: `Healing ${randomUUID()}`, description: "Disposable aftercare fixture" } });
  const visit = await prisma.appointment.create({ data: { projectId: project.id, startsAt: new Date(Date.now() - 5 * 86400000), endsAt: new Date(Date.now() - 5 * 86400000 + 3600000), status: "confirmed" } });
  const completed = await prisma.appointment.update({ where: { id: visit.id }, data: { status: "completed" } });
  expect(completed.aftercareStartedAt).toBeTruthy();
  const original = await prisma.siteSetting.findUnique({ where: { key: "aftercare_settings" } });
  const staff = await browser.newContext();
  try {
    await prisma.siteSetting.upsert({ where: { key: "aftercare_settings" }, create: { key: "aftercare_settings", value: JSON.stringify({ enabled: true, checkInDay: 2, photoDay: 21, reviewDay: 30, reviewUrl: "https://g.page/test/review" }) }, update: { value: JSON.stringify({ enabled: true, checkInDay: 2, photoDay: 21, reviewDay: 30, reviewUrl: "https://g.page/test/review" }) } });
    const cron = () => page.request.get("/api/cron/aftercare", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const results = await Promise.all([cron(), cron()]); expect(results.every(result => result.status() === 200)).toBe(true);
    expect(await prisma.clientNotification.count({ where: { appointmentId: visit.id, type: "AFTERCARE_instructions" } })).toBe(1);
    await page.goto("/app"); await page.getByLabel("E-MAIL", { exact: true }).fill(email); await page.getByLabel("HASŁO", { exact: true }).fill(password); await page.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click(); await expect(page).toHaveURL(/\/app\/portal/);
    await page.goto(`/app/portal/aftercare?appointment=${visit.id}`); await expect(page.getByRole("heading", { name: project.title, exact: true })).toBeVisible();
    const chooser = page.waitForEvent("filechooser"); await page.getByRole("button", { name: "+ DODAJ ZDJĘCIE GOJENIA", exact: true }).click();
    const uploaded = page.waitForResponse(response => response.url().endsWith(`/api/client/projects/${project.id}/images`) && response.request().method() === "POST");
    const png = await require("sharp")({ create: { width: 64, height: 64, channels: 3, background: "#777777" } }).png().toBuffer();
    await (await chooser).setFiles({ name: "healing.png", mimeType: "image/png", buffer: png }); expect((await uploaded).status()).toBe(201);
    const image = page.getByRole("img", { name: "Prywatne zdjęcie gojenia", exact: true }); await expect(image).toBeVisible(); await expect.poll(() => image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
    expect(await prisma.projectImage.count({ where: { projectId: project.id, appointmentId: visit.id, kind: "healing" } })).toBe(1);
    await page.getByRole("button", { name: "Poproś studio o konsultację", exact: true }).click(); await page.getByRole("dialog", { name: "Potwierdź akcję", exact: true }).getByRole("button", { name: "Potwierdź", exact: true }).click();
    await expect(page.getByRole("button", { name: "Konsultacja zgłoszona", exact: true })).toBeDisabled();
    expect(await prisma.projectMessage.count({ where: { projectId: project.id } })).toBe(1);
    const admin = await staff.newPage(); await loginFeatureAdmin(admin);
    await admin.goto("http://127.0.0.1:3120/admin/aftercare"); await admin.getByRole("button", { name: "Oznacz konsultację jako obsłużoną", exact: true }).click(); await admin.getByRole("dialog", { name: "Potwierdź akcję", exact: true }).getByRole("button", { name: "Potwierdź", exact: true }).click();
    await expect.poll(async () => Boolean((await prisma.appointment.findUniqueOrThrow({ where: { id: visit.id } })).aftercareConsultationResolvedAt)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  } finally {
    await staff.close(); if (original) await prisma.siteSetting.upsert({ where: { key: original.key }, create: { key: original.key, value: original.value }, update: { value: original.value } }); else await prisma.siteSetting.deleteMany({ where: { key: "aftercare_settings" } });
  }
});

test("announcements lifecycle and consistent CMS workspace", async ({ page, browser }) => {
  await page.goto("/admin/login");
  await page.getByLabel("EMAIL", { exact: true }).fill(`admin-${email}`);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const [path, title] of [["pages", "Strony i builder"], ["portfolio", "Portfolio / Galeria"], ["media", "Biblioteka mediów"]]) {
    await page.goto(`/admin/${path}`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveClass(/studio-page-title/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.goto("/admin/announcements");
  const title = `Browser announcement ${randomUUID()}`;
  await page.getByLabel("Tytuł", { exact: true }).fill(title);
  await page.getByLabel("Treść", { exact: true }).fill("Nowe terminy ✨");
  await page.getByLabel("Treść", { exact: true }).press("ControlOrMeta+A");
  await page.getByRole("button", { name: "Pogrubienie", exact: true }).click();
  await expect(page.getByLabel("Treść", { exact: true })).toHaveValue("**Nowe terminy ✨**");
  await page.getByRole("button", { name: "Wybierz emoji", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj 🎁", exact: true }).click();
  // This test may only upload to the isolated runner filesystem, not external storage.
  if (process.env.S3_ENDPOINT || process.env.BLOB_READ_WRITE_TOKEN) throw new Error("External public media storage forbidden in browser fixture");
  const uploadedAnnouncement = page.waitForResponse(response => response.url().endsWith("/api/admin/media") && response.request().method() === "POST");
  const announcementPng = await require("sharp")({ create: { width: 64, height: 64, channels: 3, background: { r: 201, g: 154, b: 74 } } }).png().toBuffer();
  await page.getByLabel("Prześlij obraz do komunikatu").setInputFiles({ name: "announcement.png", mimeType: "image/png", buffer: announcementPng });
  const uploadedResponse = await uploadedAnnouncement;
  expect(uploadedResponse.status()).toBe(201);
  const uploadedMedia = (await uploadedResponse.json()).media;
  announcementMedia.push(uploadedMedia);
  await page.getByLabel("Opis obrazu 1").fill("Obraz promocji studia");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: "Opublikuj dla klientów", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Komunikat opublikowany.");
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: "client-announcement:" } } });
  const announcement = rows.map(r => JSON.parse(r.value)).find(a => a.title === title);
  expect(announcement).toBeTruthy(); announcementIds.push(announcement.id);
  expect(await prisma.clientNotification.count({ where: { type: `announcement:${announcement.id}` } })).toBe(0);
  const context = await browser.newContext();
  try {
    const clientPage = await context.newPage();
    await clientPage.goto("http://127.0.0.1:3120/app");
    await clientPage.getByLabel("E-MAIL", { exact: true }).fill(email);
    await clientPage.getByLabel("HASŁO", { exact: true }).fill(password);
    await clientPage.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
    await expect(clientPage.getByRole("heading", { name: title, exact: true })).toBeVisible();
    const published = clientPage.locator(`#announcement-${announcement.id}`);
    await expect(published.locator("strong").filter({ hasText: "Nowe terminy ✨" })).toBeVisible();
    await expect(published).toContainText("🎁");
    await expect(published.getByRole("img", { name: "Obraz promocji studia" })).toBeVisible();
    await published.getByRole("img", { name: "Obraz promocji studia" }).scrollIntoViewIfNeeded();
    const rawImageResponse = await clientPage.request.get(uploadedMedia.url);
    expect(rawImageResponse.status(), "Registered public upload must be readable").toBe(200);
    const imageSource = await published.getByRole("img", { name: "Obraz promocji studia" }).evaluate(image => image.currentSrc || image.src);
    const optimizedImageResponse = await clientPage.request.get(imageSource, { headers: { accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" } });
    const imageError = optimizedImageResponse.ok() ? "" : (await optimizedImageResponse.text()).slice(0, 150);
    expect(optimizedImageResponse.status(), `Image optimizer: ${imageError}`).toBe(200);
    const decoded = await require("sharp")(await optimizedImageResponse.body()).metadata();
    expect(decoded.width).toBeGreaterThan(0);
    expect(decoded.height).toBeGreaterThan(0);
    await expect.poll(() => published.getByRole("img", { name: "Obraz promocji studia" }).evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
    await clientPage.getByRole("button", { name: `Zamknij komunikat: ${title}`, exact: true }).click();
    await expect(clientPage.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await clientPage.reload(); await expect(clientPage.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    const notifiedId = randomUUID(); announcementIds.push(notifiedId);
    const input = { id: notifiedId, title: `${title} bell`, body: "In-app only", href: "/app/portal/calendar", notify: true, expiresAt: new Date(Date.now() + 86400000).toISOString() };
    // Use the browser's cookie handling (Secure session on CI's loopback HTTP).
    const publish = (payload) => page.evaluate(async data => {
      const response = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      return { status: response.status, data: await response.json() };
    }, payload);
    const response = await publish(input);
    expect(response.status).toBe(200);
    const duplicate = await publish(input); expect(duplicate.data.duplicate).toBe(true);
    const client = await prisma.client.findUniqueOrThrow({ where: { email } });
    expect(await prisma.clientNotification.count({ where: { clientId: client.id, type: `announcement:${notifiedId}` } })).toBe(1);
    await clientPage.reload(); await expect(clientPage.getByRole("heading", { name: input.title, exact: true })).toBeVisible();
    const disabled = await page.evaluate(async id => {
      const response = await fetch("/api/admin/announcements", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); return response.status;
    }, notifiedId); expect(disabled).toBe(200);
    await clientPage.reload(); await expect(clientPage.getByRole("heading", { name: input.title, exact: true })).toHaveCount(0);
    expect(await prisma.clientNotification.count({ where: { type: `announcement:${notifiedId}` } })).toBe(0);
  } finally { await context.close(); }
});

test("media details expand independently without stretching other cards", async ({ page }) => {
  const prefix = `layout-${randomUUID()}`;
  for (const suffix of ["first", "second"]) {
    const media = await prisma.media.create({ data: { filename: `${prefix}-${suffix}.jpg`, url: "/images/portrait.jpg", width: 640, height: 480, size: 1200 } });
    mediaLayoutIds.push(media.id);
  }
  await page.goto("/admin/login");
  await page.getByLabel("EMAIL", { exact: true }).fill(`admin-${email}`);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/media");
  await page.getByRole("textbox", { name: "Szukaj w bibliotece mediów" }).fill(prefix);
  const cards = page.locator(".studio-media-grid > article");
  await expect(cards).toHaveCount(2);
  const firstHeight = await cards.nth(0).evaluate(element => element.getBoundingClientRect().height);
  const secondHeight = await cards.nth(1).evaluate(element => element.getBoundingClientRect().height);
  await cards.nth(0).getByRole("button", { name: /Pokaż informacje/ }).click();
  await expect(cards.nth(0).getByRole("textbox")).toBeVisible();
  await expect(cards.nth(1).getByRole("textbox")).not.toBeVisible();
  expect(await cards.nth(0).evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(firstHeight);
  expect(await cards.nth(1).evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(secondHeight, 0);
  await cards.nth(1).getByRole("button", { name: /Pokaż informacje/ }).click();
  await expect(cards.nth(1).getByRole("textbox")).toBeVisible();
  await expect(cards.nth(0).getByRole("textbox")).not.toBeVisible();
  expect(await cards.nth(0).evaluate(element => element.getBoundingClientRect().height)).toBeCloseTo(firstHeight, 0);
});

test("admin login, client card rendering and logout", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("EMAIL", { exact: true }).fill(`admin-${email}`);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const queueClient = await prisma.client.findUniqueOrThrow({ where: { email } });
  const queueProject = await prisma.tattooProject.create({ data: { clientId: queueClient.id, title: "Browser queue dates", description: "Disposable queue regression", status: "awaiting_confirmation" } });
  try {
    const dates = [10, 5].map(days => new Date(Date.now() + days * 86400000));
    const queueVisits = [];
    for (const startsAt of dates) queueVisits.push(await prisma.appointment.create({ data: { projectId: queueProject.id, startsAt, endsAt: new Date(+startsAt + 3600000), status: "requested" } }));
    await page.reload();
    const queue = page.getByRole("region", { name: "Kolejka działań", exact: true });
    await expect(queue).toBeVisible();
    await expect(queue.getByText(/Raport monitoringu/)).toHaveCount(0);
    await page.getByRole("button", { name: /^Zgłoszenia ·/ }).click();
    const requests = queue.getByRole("link").filter({ hasText: "Browser queue dates" });
    await expect(requests).toHaveCount(2);
    await expect(requests.first()).toHaveAttribute("href", `/admin/calendar?appointment=${queueVisits[1].id}`);
    await expect(requests.first().locator("time").first()).toHaveAttribute("datetime", dates[1].toISOString());
    await page.getByRole("button", { name: /^Wszystkie ·/ }).click();
    if (page.viewportSize().width >= 1024) await expect.poll(async () => {
      const today = await page.locator('[data-section-id="today"]').boundingBox();
      const upcoming = await page.locator('[data-section-id="upcoming"]').boundingBox();
      return upcoming.y - (today.y + today.height);
    }).toBeLessThan(35);
    await expect(page.getByRole("button", { name: "Ukryj: Plan dnia", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /^Dostosuj sekcje/ }).click();
    await expect(page.getByRole("button", { name: "Ukryj: Plan dnia", exact: true })).toBeVisible();
    const width = page.getByRole("button", { name: "Szerokość: Plan dnia", exact: true });
    const widthSaved = page.waitForResponse(r => r.url().endsWith("/api/admin/section-layout") && r.request().method() === "PUT");
    await width.click();
    expect((await widthSaved).status()).toBe(200);
    await expect(width).toHaveAttribute("aria-pressed", "true");
    const widthRestored = page.waitForResponse(r => r.url().endsWith("/api/admin/section-layout") && r.request().method() === "PUT");
    await width.click();
    expect((await widthRestored).status()).toBe(200);
    await page.getByRole("button", { name: /^Zakończ dostosowanie/ }).click();
    await page.getByRole("button", { name: "Powiadomienia", exact: true }).click();
    const requestNotice = page.getByRole("region", { name: "Prośby o wizytę" }).getByRole("link").filter({ hasText: "Browser queue dates" }).first();
    await expect(requestNotice).toContainText("Proponowany termin:");
    await requestNotice.click();
    const editor = page.getByRole("dialog");
    await expect(editor).toBeVisible();
    await expect(editor).toHaveClass(/studio-drawer/);
    await expect(editor).toContainText("Browser queue dates");
    await editor.getByRole("button", { name: "Dokumenty", exact: true }).click();
    const visitReturnUrl = page.url();
    await editor.getByRole("link", { name: "Podpisy sesji i kod QR", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/appointments\/[^/]+\/documents$/);
    await expect(page.getByText(consent.title, { exact: false })).toBeVisible();
    await expect(page.getByRole("img", { name: "Kod QR formularza tej sesji", exact: true })).toBeVisible();
    await page.goto(visitReturnUrl);
    await editor.getByRole("button", { name: "Rozmowa", exact: true }).click();
    await expect(editor.getByRole("textbox").first()).toBeVisible();
    await editor.getByRole("button", { name: "Wizyta", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/calendar$/);
    await page.getByRole("button", { name: "Powiadomienia", exact: true }).click();
    await page.getByRole("region", { name: "Prośby o wizytę" }).getByRole("link").filter({ hasText: "Browser queue dates" }).last().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`appointment=${queueVisits[0].id}$`));
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Dragging is only a proposal until the owner explicitly confirms it.
    const week = page.getByTestId("studio-week");
    const visitCard = week.locator(".studio-week-visit").filter({ hasText: "Browser queue dates" }).first();
    if (page.viewportSize().width >= 1024) {
      await visitCard.dragTo(week.getByRole("button", { name: /^Zaplanuj .*18:00$/ }).last());
      const moveConfirmation = page.getByRole("dialog");
      await expect(moveConfirmation).toContainText("Przenieść wizytę");
      await moveConfirmation.getByRole("button", { name: "Anuluj", exact: true }).click();
      await expect(moveConfirmation).toHaveCount(0);
    } else {
      // Touch users change the date in the same drawer; no off-screen mouse drag.
      await visitCard.click();
      const dateEditor = page.getByRole("dialog");
      const startField = dateEditor.getByLabel("DATA I GODZINA OD", { exact: true });
      const originalStart = await startField.inputValue();
      await startField.fill(originalStart.slice(0, 11) + "18:00");
      await expect(startField).toHaveValue(originalStart.slice(0, 11) + "18:00");
      await dateEditor.getByRole("button", { name: "Dokumenty", exact: true }).click();
      await expect(dateEditor.getByRole("button", { name: "Wizyta", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Escape");
      await expect(dateEditor).toHaveCount(0);
    }
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: queueVisits[0].id } })).startsAt.toISOString()).toBe(dates[0].toISOString());
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: queueVisits[1].id } })).startsAt.toISOString()).toBe(dates[1].toISOString());
  } finally { await prisma.tattooProject.delete({ where: { id: queueProject.id } }); }
  await page.goto("/admin/calendar");
  await expect(page.getByTestId("studio-week")).toBeVisible();
  await page.getByRole("button", { name: "Następny tydzień", exact: true }).click();
  await expect(page.getByTestId("studio-week").locator("section")).toHaveCount(7);
  await page.getByRole("button", { name: "Dziś", exact: true }).click();
  await verifyCalendarPresentation(page);
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  await page.goto(`/admin/clients/${client.id}`);
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  const identity = page.getByTestId("client-identity");
  await expect(identity.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(identity.getByRole("list", { name: /pieczątek w kolejnym cyklu/ })).toBeVisible();
  const loyaltyDetails = page.locator("details[aria-label='Karta lojalnościowa']");
  await expect(loyaltyDetails).not.toHaveAttribute("open", "");
  await loyaltyDetails.locator(":scope > summary").click();
  await expect(loyaltyDetails).toHaveAttribute("open", "");
  await expect(page.getByRole("list", { name: /pieczątek w kolejnym cyklu/ })).toHaveCount(1);
  await expect(loyaltyDetails.getByText("Przenieś papierową kartę", { exact: true })).toBeVisible();
  await loyaltyDetails.locator(":scope > summary").click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "EDYTUJ DANE", exact: true }).click();
  await expect(page.getByLabel("E-MAIL", { exact: false })).toHaveAttribute("readonly", "");
  await page.getByLabel("ŹRÓDŁO ZGŁOSZENIA", { exact: true }).selectOption("instagram");
  const savedClient = page.waitForResponse(response => response.url().endsWith(`/api/admin/clients/${client.id}`) && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "ZAPISZ", exact: true }).click();
  expect((await savedClient).status()).toBe(200);
  await expect(page.getByText("Źródło zgłoszenia: Instagram", { exact: true })).toBeVisible();
  expect((await prisma.client.findUniqueOrThrow({ where: { id: client.id } })).leadSource).toBe("instagram");
  const sessionProject = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Browser session ordering", description: "Disposable UI regression" } });
  const oldVisit = await prisma.appointment.create({ data: { projectId: sessionProject.id, startsAt: new Date(Date.now() - 172800000), endsAt: new Date(Date.now() - 169200000), status: "completed", price: 900 } });
  const newVisit = await prisma.appointment.create({ data: { projectId: sessionProject.id, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() - 82800000), status: "confirmed", price: 1400 } });
  await page.goto(`/admin/calendar?appointment=${newVisit.id}`);
  const visitDrawer = page.getByRole("dialog");
  await visitDrawer.getByRole("button", { name: "Zakończ / rozlicz", exact: true }).click();
  await expect(visitDrawer.getByLabel("Wizyta do zakończenia lub rozliczenia")).toHaveValue(newVisit.id);
  await expect(visitDrawer.getByRole("button", { name: "Zakończ i zapisz rozliczenie", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(visitDrawer).toHaveCount(0);
  await page.goto("/admin/finance");
  await expect(page.getByRole("heading", { name: "Finanse", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Browser Fixture/ }).first()).toBeVisible();
  await page.goto(`/admin/clients/${client.id}?view=appointments`);
  const sessions = page.locator("section").filter({ has: page.getByText("Browser session ordering", { exact: true }) }).last();
  await expect(sessions.getByRole("button").nth(0)).toContainText("POTWIERDZONA");
  await sessions.getByRole("button", { name: "Rozlicz", exact: true }).first().click();
  const settlement = page.getByRole("dialog", { name: "Zakończ i rozlicz wizytę", exact: true });
  await expect(settlement.getByLabel("Wizyta do zakończenia lub rozliczenia")).toHaveValue(newVisit.id);
  await expect(settlement.getByLabel("Potwierdzam odbiór całej należności", { exact: false })).not.toBeChecked();
  await settlement.getByLabel("Co dalej z projektem?").selectOption("next");
  await settlement.getByLabel("Wizyta do zakończenia lub rozliczenia").selectOption(oldVisit.id);
  await expect(settlement.getByLabel("Co dalej z projektem?")).toHaveValue("keep");
  await expect(settlement.getByRole("button", { name: "Zakończ i zapisz rozliczenie", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(settlement).toHaveCount(0);
  await page.goto(`/admin/clients/${client.id}?view=appointments&settle=${newVisit.id}`);
  await expect(page.getByRole("dialog", { name: "Zakończ i rozlicz wizytę", exact: true }).getByLabel("Wizyta do zakończenia lub rozliczenia")).toHaveValue(newVisit.id);
  await page.keyboard.press("Escape");
  expect(await prisma.loyaltyEntry.count({ where: { appointmentId: { in: [oldVisit.id, newVisit.id] } } })).toBe(0);
  await page.goto(`/admin/clients/${client.id}`);
  const privacyRequest = await prisma.accountDeletionRequest.create({ data: { clientId: client.id } });
  const privateReason = "Wewnętrzna ocena właściciela — nie udostępniać w portalu.";
  const publicResponse = "Wniosek oceniony. Wykonanie wymaga osobnego zatwierdzenia.";
  await page.goto("/admin/clients");
  const reviewForm = page.locator(`[data-privacy-request="${privacyRequest.id}"]`);
  await reviewForm.getByText("OCENA I RETENCJA", { exact: true }).click();
  await reviewForm.getByLabel("Decyzja", { exact: true }).selectOption("approve");
  await reviewForm.getByLabel("Uzasadnienie i podstawa retencji — tylko dla właściciela", { exact: true }).fill(privateReason);
  await reviewForm.getByLabel("Tożsamość i zakres wniosku zostały ocenione", { exact: true }).check();
  await reviewForm.getByLabel("Odpowiedź widoczna dla klienta", { exact: true }).fill(publicResponse);
  const reviewSaved = page.waitForResponse(response => response.url().endsWith(`/api/admin/privacy-requests/${privacyRequest.id}`) && response.request().method() === "PATCH");
  await reviewForm.getByRole("button", { name: "ZAPISZ OCENĘ", exact: true }).click();
  expect((await reviewSaved).status()).toBe(200);
  const savedRequest = await prisma.accountDeletionRequest.findUniqueOrThrow({ where: { id: privacyRequest.id } });
  expect(savedRequest.status).toBe("awaiting_execution"); expect(savedRequest.resolvedAt).toBeNull();
  const ownClient = await page.context().browser().newContext();
  try {
    const ownPage = await ownClient.newPage();
    await ownPage.goto("http://127.0.0.1:3120/app");
    await ownPage.getByLabel("E-MAIL", { exact: true }).fill(email);
    await ownPage.getByLabel("HASŁO", { exact: true }).fill(password);
    const ownLogin = ownPage.waitForResponse(response => response.url().endsWith("/api/client/auth/login") && response.request().method() === "POST");
    await ownPage.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
    expect((await ownLogin).status()).toBe(200);
    await expect(ownPage).toHaveURL(/\/app\/portal/);
    await ownPage.goto("http://127.0.0.1:3120/app/portal/profile?clientId=not-own-client");
    await ownPage.getByText("TWÓJ WNIOSEK DOTYCZĄCY DANYCH", { exact: true }).click();
    await expect(ownPage.getByText(publicResponse, { exact: true })).toBeVisible();
    expect(await ownPage.content()).not.toContain(privateReason);
    expect((await ownPage.request.patch(`http://127.0.0.1:3120/api/admin/privacy-requests/${privacyRequest.id}`, { headers: { origin: "http://127.0.0.1:3120" }, data: {} })).status()).toBe(401);
  } finally { await ownClient.close(); }
  cmsPage = await prisma.page.create({ data: { title: "Browser CMS fixture", slug: `browser-cms-${randomUUID()}`, status: "draft", showInNav: false, modules: JSON.stringify([{ id: "browser-image-fixture", type: "image", data: { image: "/images/texture-bg.jpg", alt: "Browser image fixture", fit: "contain" } }]) } });
  const visitor = await page.context().browser().newContext();
  const publicPage = await visitor.newPage();
  try {
    expect((await publicPage.goto(`http://127.0.0.1:3120/${cmsPage.slug}`)).status()).toBe(404);
    await page.goto(`/admin/pages/${cmsPage.id}`);
    await expect(page.locator(".builder-canvas").getByRole("img", { name: "Browser image fixture", exact: true }).locator("..")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.getByRole("complementary", { name: "Nawigator struktury strony" })).toHaveCount(0);
    const openTools = page.getByRole("button", { name: "Pokaż panel narzędzi", exact: true });
    if (await openTools.count()) await openTools.click();
    await page.getByRole("button", { name: /Hero · swobodny/ }).click();
    await expect(page.locator(".builder-canvas").getByRole("heading", { name: "Twój pomysł. Twój styl.", exact: true })).toBeVisible();
    await page.locator(".builder-canvas").getByRole("heading", { name: "Twój pomysł. Twój styl.", exact: true }).click();
    await page.getByRole("tab", { name: "STYL", exact: true }).click();
    const textEffects = page.getByRole("button", { name: "Ustawienia: Obrys i cień tekstu", exact: true });
    await expect(textEffects).toBeVisible();
    expect(await textEffects.evaluate((button) => button.closest("details").querySelector(":scope > summary").textContent.trim())).toBe("Tekst");
    const textSummary = page.locator("summary").filter({ hasText: /^Tekst$/ });
    await textSummary.click();
    await expect(textEffects).not.toBeVisible();
    await textSummary.click();
    await textEffects.click();
    await expect(page.getByRole("dialog", { name: "Obrys i cień tekstu", exact: true })).toBeVisible();
    // Visibility precedes the popover's requestAnimationFrame autofocus.
    await expect(page.getByRole("dialog", { name: "Obrys i cień tekstu", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(textEffects).toBeFocused();
    await page.locator("summary").filter({ hasText: /^Nakładka i wzór$/ }).click();
    await page.getByRole("textbox", { name: "OBRAZ NAKŁADKI — adres obrazu", exact: true }).fill("/images/texture-bg.jpg");
    await expect.poll(() => page.locator('.builder-canvas .builder-overlay-layer[style*="texture-bg.jpg"]').count()).toBe(1);
    await expect(page.locator('.builder-canvas .builder-overlay-layer[style*="texture-bg.jpg"]')).toHaveCSS("opacity", "1");
    await page.locator("summary").filter({ hasText: /^Nakładka i wzór$/ }).click();
    await expect(page.getByRole("dialog", { name: "Typografia", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Ustawienia: Typografia", exact: true }).click();
    const typography = page.getByRole("dialog", { name: "Typografia", exact: true });
    await expect(typography).toBeVisible();
    const popupFits = await typography.evaluate((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; });
    expect(popupFits).toBe(true);
    await expect(page.getByRole("dialog", { name: "Typografia", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Ustawienia: Typografia", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Ustawienia: KOLOR TEKSTU — kolory globalne", exact: true }).click();
    await page.getByRole("dialog", { name: "KOLOR TEKSTU — kolory globalne", exact: true }).getByRole("button", { name: "Akcent", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ukryj panel narzędzi", exact: true }).click();
    await expect.poll(() => page.locator(".builder-canvas").evaluate((element) => element.clientWidth)).toBeGreaterThan(300);
    await page.getByRole("button", { name: "Prowadnice", exact: true }).click();
    await page.getByRole("button", { name: "Dodaj pionową prowadnicę", exact: true }).click();
    await page.getByRole("button", { name: "Ustawienia: Prowadnice — pozycja i kąt", exact: true }).click();
    await page.getByLabel("Prowadnica 1 — x", { exact: true }).fill("100");
    await page.getByLabel("Prowadnica 1 — angle", { exact: true }).fill("30");
    await page.getByRole("button", { name: "Duplikuj", exact: true }).click();
    await expect(page.getByLabel("Prowadnica 2 — x", { exact: true })).toHaveValue("116");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Prowadnica 2: X/ }).press("ArrowRight");
    await expect(page.getByRole("button", { name: /^Prowadnica 2: X 117 px/ })).toBeVisible();
    // Tall image fixtures can scroll the canvas while the selected heading or
    // guide takes focus. Measure and drag from a visible canvas origin.
    await page.locator(".builder-canvas").evaluate((canvas) => {
      for (let parent = canvas.parentElement; parent; parent = parent.parentElement) {
        if (parent.scrollHeight > parent.clientHeight) parent.scrollTop = 0;
      }
    });
    const canvasBox = await page.locator(".builder-canvas").boundingBox();
    const guideBox = await page.getByRole("button", { name: /^Prowadnica 2: X/ }).evaluate((line) => { const layer = line.closest("svg"); const rect = layer.getBoundingClientRect(); return { x: rect.x + 117, y: rect.y + 216 }; });
    expect(canvasBox).not.toBeNull();
    await page.mouse.move(guideBox.x, guideBox.y);
    await page.mouse.down();
    await page.mouse.move(guideBox.x + 20, guideBox.y + 10, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByRole("button", { name: /^Prowadnica 2: X 137 px, Y 226 px/ })).toBeVisible();
    await page.getByRole("button", { name: "Prowadnice", exact: true }).click();
    await page.getByRole("button", { name: "OPUBLIKUJ", exact: true }).click();
    await expect.poll(async () => (await prisma.page.findUniqueOrThrow({ where: { id: cmsPage.id } })).status).toBe("published");
    expect((await publicPage.goto(`http://127.0.0.1:3120/${cmsPage.slug}`)).status()).toBe(200);
    await expect(publicPage).toHaveTitle(/Browser CMS fixture/);
    await expect(publicPage.getByRole("img", { name: "Browser image fixture", exact: true }).locator("..")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(publicPage.locator('.builder-overlay-layer[style*="texture-bg.jpg"]')).toHaveCSS("opacity", "1");
    await expect(publicPage.getByRole("heading", { name: "Twój pomysł. Twój styl.", exact: true })).toBeVisible();
    page.once("dialog", async (dialog) => { expect(dialog.message()).toContain("Cofnąć publikację?"); await dialog.accept(); });
    await page.getByRole("button", { name: "COFNIJ PUBLIKACJĘ", exact: true }).click();
    await expect.poll(async () => (await prisma.page.findUniqueOrThrow({ where: { id: cmsPage.id } })).status).toBe("unpublished");
    expect((await publicPage.goto(`http://127.0.0.1:3120/${cmsPage.slug}`)).status()).toBe(404);
  } finally { await visitor.close(); }
  await page.goto("/admin");
  await prisma.adminUser.update({ where: { id: adminId }, data: { role: "artist" } });
  expect(await page.evaluate(async id => (await fetch(`/api/admin/privacy-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" })).status, privacyRequest.id)).toBe(403);
  expect(await page.evaluate(async () => (await fetch("/api/admin/google-calendar/calendars")).status)).toBe(403);
  if (test.info().project.name === "mobile") await page.getByRole("button", { name: "Otwórz nawigację administratora", exact: true }).click();
  await page.getByRole("button", { name: "WYLOGUJ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("voucher issuance, focused booking, automatic settlement and truthful message receipts", async ({ page, browser }) => {
  test.setTimeout(180000);
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const api = (surface, path, method, body) => surface.evaluate(async ({ path, method, body }) => { const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: res.status, data: await res.json() }; }, { path, method, body });
  try {
    const operator = await loginFeatureAdmin(adminPage);
    await adminPage.goto("/admin/settings?category=care");
    await expect(adminPage.getByRole("heading", { name: /Aftercare|Opieka/ }).first()).toBeVisible();
    await expect(adminPage.getByRole("navigation").getByRole("link", { name: "Aftercare", exact: true })).toHaveCount(0);
    await adminPage.goto("/admin/vouchers");
    await adminPage.getByLabel("Wartość (zł)", { exact: true }).fill("300");
    await adminPage.getByLabel("Imię i nazwisko", { exact: true }).fill("Browser Fixture");
    const expiry = new Date(); expiry.setUTCFullYear(expiry.getUTCFullYear() + 1);
    await adminPage.getByLabel("Ważny do", { exact: true }).fill(expiry.toISOString().slice(0, 10));
    const issued = adminPage.waitForResponse(r => r.url().endsWith("/api/admin/vouchers") && r.request().method() === "POST");
    await adminPage.getByRole("button", { name: "Wygeneruj voucher i QR", exact: true }).click();
    const issuedResponse = await issued; expect(issuedResponse.status()).toBe(201);
    const voucher = await issuedResponse.json(); voucherCodes.push(voucher.code);
    await expect(adminPage.getByRole("button", { name: "Wygeneruj voucher i QR", exact: true })).toBeDisabled();
    await page.goto(voucher.href);
    await expect(page.getByText("Browser Fixture", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /QR/ })).toBeVisible();
    expect(await page.getByRole("img", { name: /QR/ }).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.getByText(/Niewykorzystana kwota przepada/)).toBeVisible();
    await page.goto("/app");
    await page.getByLabel("E-MAIL", { exact: true }).fill(email);
    await page.getByLabel("HASŁO", { exact: true }).fill(password);
    await page.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/portal/);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Aftercare", exact: true })).toHaveCount(0);
    const client = await prisma.client.findUniqueOrThrow({ where: { email } });
    await prisma.loyaltyEntry.create({ data: { clientId: client.id, key: "voucher-browser-reward-" + randomUUID(), kind: "paper", stamps: 5, note: "Isolated booking eligibility fixture", adminId: operator } });
    const start = new Date(); start.setUTCDate(start.getUTCDate() + 18); start.setUTCHours(10, 0, 0, 0);
    const available = await prisma.availableSlot.create({ data: { startsAt: start, endsAt: new Date(start.getTime() + 3600000), isPublic: true, title: "Voucher browser slot" } }); flashSlotIds.push(available.id);
    await page.goto("/app/portal/calendar?booking=" + encodeURIComponent(start.toISOString()) + "&voucher=" + voucher.code);
    const booking = page.getByRole("dialog").last();
    await expect(booking.getByText("Zapisz szkic", { exact: true })).not.toBeVisible();
    await expect(booking.getByRole("checkbox", { name: /nagrodę lojalnościową/ })).toHaveCount(0);
    await page.getByLabel("NAZWA / KRÓTKI TEMAT (OPCJONALNIE)", { exact: true }).fill("Browser voucher tattoo");
    await page.getByLabel("OPIS / POMYSŁ", { exact: true }).fill("Disposable end-to-end voucher booking.");
    await page.getByRole("button", { name: "DALEJ", exact: true }).click();
    const pending = booking.locator("fieldset input[type=checkbox]");
    if (await pending.count()) { for (const checkbox of await pending.all()) await checkbox.check(); await page.getByRole("button", { name: "DALEJ", exact: true }).click(); }
    await expect(booking.getByRole("button", { name: "DALEJ", exact: true })).toHaveCount(0);
    const reward = booking.getByRole("checkbox", { name: /nagrodę lojalnościową/ });
    await expect(reward).toBeVisible(); await reward.check();
    const useVoucher = booking.getByRole("checkbox", { name: "Wykorzystaj voucher", exact: true });
    await useVoucher.check(); await expect(reward).not.toBeChecked();
    await booking.getByLabel("Kod vouchera", { exact: true }).fill(voucher.code);
    await booking.getByRole("button", { name: "Sprawdź voucher", exact: true }).click();
    await expect(booking.getByRole("status")).toContainText("300");
    await test.info().attach("voucher-summary-" + test.info().project.name, { body: await page.screenshot(), contentType: "image/png" });
    const pixels = await require("sharp")({ create: { width: 2, height: 2, channels: 4, background: "#c49b47" } }).png().toBuffer();
    await booking.getByLabel("Zdjęcie vouchera (opcjonalnie)", { exact: true }).setInputFiles({ name: "voucher.png", mimeType: "image/png", buffer: pixels });
    await booking.getByRole("button", { name: "WYŚLIJ PROŚBĘ O WIZYTĘ", exact: true }).click();
    await expect(booking.getByRole("alert")).toContainText("Potwierdź poprawność");
    await booking.getByRole("checkbox", { name: "Potwierdzam poprawność projektu, terminu i zaakceptowanych wersji zgód.", exact: true }).check();
    await expect(booking.getByRole("alert")).toHaveCount(0);
    const created = page.waitForResponse(r => r.url().endsWith("/api/client/appointments") && r.request().method() === "POST");
    await booking.getByRole("button", { name: "WYŚLIJ PROŚBĘ O WIZYTĘ", exact: true }).click();
    const result = await created; expect(result.status()).toBe(201);
    const booked = await result.json();
    await expect(booking.getByText("PROŚBA O WIZYTĘ WYSŁANA", { exact: true })).toBeVisible();
    await expect.poll(() => prisma.projectImage.count({ where: { appointmentId: booked.appointment.id, kind: "voucher" } })).toBe(1);
    expect(await prisma.voucher.findUniqueOrThrow({ where: { code: voucher.code } })).toMatchObject({ clientId: client.id, appointmentId: booked.appointment.id, redeemedAt: null });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: booked.appointment.id } })).loyaltyReserved).toBe(false);
    await prisma.appointment.update({ where: { id: booked.appointment.id }, data: { status: "confirmed" } });
    await page.goto("/app/portal/documents?appointment=" + booked.appointment.id);
    await expect(page.getByText("Browser voucher tattoo", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Dokumenty umówionej sesji", exact: true })).toBeVisible();
    await page.goto("/app/portal/calendar");
    const sent = await api(adminPage, "/api/admin/clients/" + client.id + "/messages", "POST", { body: "Voucher receipt regression " + voucher.code });
    expect(sent.status).toBe(201); const message = sent.data.message;
    await adminPage.goto("/admin/clients/" + client.id + "?view=messages");
    const own = adminPage.locator("article").filter({ hasText: "Voucher receipt regression " + voucher.code });
    await expect(own.getByRole("img", { name: "Wysłano", exact: true })).toBeVisible();
    const delivered = await api(page, "/api/client/messages", "PATCH", { state: "delivered", ids: [message.id] });
    expect(delivered.status).toBe(200);
    await adminPage.reload(); await expect(own.getByRole("img", { name: "Dostarczono do rozmówcy", exact: true })).toBeVisible();
    expect((await prisma.directMessage.findUniqueOrThrow({ where: { id: message.id } })).readAt).toBeNull();
    await page.bringToFront();
    await page.goto("/app/portal/messages");
    await page.getByRole("button").filter({ hasText: "Wiadomość ogólna" }).first().click();
    await expect.poll(async () => Boolean((await prisma.directMessage.findUniqueOrThrow({ where: { id: message.id } })).readAt)).toBe(true);
    await adminPage.reload(); await expect(own.getByRole("img", { name: "Odczytano", exact: true })).toHaveClass(/text-emerald/);
    // Move only this disposable visit into the past. No bank payment or production data is involved.
    await prisma.appointment.update({ where: { id: booked.appointment.id }, data: { startsAt: new Date("2020-01-01T10:00:00Z"), endsAt: new Date("2020-01-01T11:00:00Z"), price: 700 } });
    await adminPage.goto("/admin/clients/" + client.id + "?view=appointments&settle=" + booked.appointment.id);
    const settlement = adminPage.getByRole("dialog", { name: "Zakończ i rozlicz wizytę", exact: true });
    await expect(settlement.getByText(/Do zapłaty łącznie:.*400/)).toBeVisible();
    await expect(settlement.getByRole("checkbox", { name: /Wykorzystaj.*pieczątek/ })).toBeDisabled();
    await settlement.getByLabel("Potwierdzam odbiór całej należności", { exact: false }).check();
    const settled = adminPage.waitForResponse(r => r.url().endsWith("/loyalty") && r.request().method() === "POST");
    await settlement.getByRole("button", { name: "Zakończ i zapisz rozliczenie", exact: true }).click();
    expect((await settled).status()).toBe(200);
    expect(await prisma.loyaltyEntry.findUniqueOrThrow({ where: { appointmentId: booked.appointment.id } })).toMatchObject({ voucherCents: 30000, paidCents: 40000, discountCents: 0 });
    expect((await prisma.voucher.findUniqueOrThrow({ where: { code: voucher.code } })).redeemedAt).not.toBeNull();
    const reuse = await api(page, "/api/client/vouchers/preview", "POST", { code: voucher.code, startsAt: start.toISOString() });
    expect(reuse.status).toBe(409);
    await page.goto("/app/portal/aftercare?appointment=" + booked.appointment.id);
    await expect(page.getByRole("heading", { name: "Pielęgnacja po sesji", exact: true })).toBeVisible();
    await adminPage.goto("/admin/settings?category=payments");
    await expect(adminPage.getByRole("link", { name: /Vouchery/ }).first()).toBeVisible();
  } finally { await adminContext.close(); }
});


function authenticatorCode(secret) {
  const bits = [...secret].map(char => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g).map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, "0");
}

test("staff can enable own MFA and save recovery codes before signing in again", async ({ page }) => {
  const id = await loginFeatureAdmin(page, "artist");
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id } });
  await page.goto("/admin/settings?category=security");
  await expect(page.getByText("STAN SYSTEMU", { exact: true })).toHaveCount(0);
  await page.getByText("LOGOWANIE I MFA", { exact: true }).click();
  const setupResponse = page.waitForResponse(response => response.url().endsWith("/api/admin/mfa") && response.request().method() === "POST");
  await page.getByRole("button", { name: "SKONFIGURUJ MFA", exact: true }).click();
  const setup = await (await setupResponse).json();
  await page.getByLabel("KOD 6-CYFROWY", { exact: true }).fill(authenticatorCode(setup.secret));
  await page.getByRole("button", { name: "WŁĄCZ I WYLOGUJ SESJE", exact: true }).click();
  const recovery = page.getByRole("region", { name: "Zapisz kody awaryjne MFA" });
  await expect(recovery).toBeVisible();
  const codes = (await recovery.locator("pre").innerText()).trim().split(/\s+/);
  expect(codes.length).toBeGreaterThan(1);
  expect(await page.evaluate(async () => (await fetch("/api/admin/mfa")).status)).toBe(401);
  await expect(recovery).toBeVisible();
  await page.getByRole("button", { name: "Zapisałem kody — przejdź do logowania", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("EMAIL", { exact: true }).fill(admin.email);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await page.getByLabel("KOD MFA LUB AWARYJNY", { exact: true }).fill(codes[0]);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  // Chromium sends Secure cookies on trusted loopback; APIRequestContext does not.
  const status = await page.evaluate(async () => {
    const response = await fetch("/api/admin/mfa");
    if (!response.ok) throw new Error(`MFA status: ${response.status}`);
    return response.json();
  });
  expect(status.enabled).toBe(true);
  expect(status.recoveryCodesLeft).toBe(codes.length - 1);
});

test("chat opens on newest messages and loads all 205 messages without duplicates", async ({ page }) => {
  await loginFeatureAdmin(page);
  const client = await prisma.client.create({ data: { email: `history-${randomUUID()}@example.com`, firstName: "History", lastName: "Fixture" } });
  try {
    // Identical timestamps exercise the ID tie-breaker at every page boundary.
    const createdAt = new Date();
    await prisma.directMessage.createMany({ data: Array.from({ length: 205 }, (_, index) => ({ id: `${client.id}-${String(index).padStart(3, "0")}`, clientId: client.id, author: "client", body: `History fixture ${String(index).padStart(3, "0")}`, createdAt })) });
    await page.goto(`/admin/clients/${client.id}?view=messages`);
    await expect(page.getByText("History fixture 204", { exact: true })).toBeVisible();
    await expect(page.getByText("History fixture 000", { exact: true })).toHaveCount(0);
    for (let batch = 0; batch < 4; batch++) {
      await page.getByRole("button", { name: "Wczytaj starsze wiadomości", exact: true }).click();
      const oldest = Math.max(0, 155 - (batch + 1) * 50);
      await expect(page.getByText(`History fixture ${String(oldest).padStart(3, "0")}`, { exact: true })).toHaveCount(1);
    }
    await expect(page.getByRole("button", { name: "Wczytaj starsze wiadomości", exact: true })).toHaveCount(0);
    await expect(page.getByText(/^History fixture \d{3}$/)).toHaveCount(205);
  } finally { await prisma.client.delete({ where: { id: client.id } }); }
});
