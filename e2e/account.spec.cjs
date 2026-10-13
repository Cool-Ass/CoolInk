const { test, expect } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("node:crypto");
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
  await prisma.client.deleteMany({ where: { email } });
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
  await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  await page.getByRole("checkbox", { name: new RegExp(consent.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).check();
  await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  await page.getByRole("checkbox", { name: "Potwierdzam poprawność projektu, terminu i zaakceptowanych wersji zgód.", exact: true }).check();
  const bookedResponse = page.waitForResponse((response) => response.url().endsWith("/api/client/appointments") && response.request().method() === "POST");
  await page.getByRole("button", { name: "WYŚLIJ PROŚBĘ O WIZYTĘ", exact: true }).click();
  const booked = await bookedResponse;
  expect(booked.status()).toBe(201);
  const booking = await booked.json();
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
    await page.goto("/admin/settings");
    await page.locator("summary").filter({ hasText: "Instrukcje BLIK, gotówka i podgląd klienta" }).click();
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
  const uiFlash = await prisma.portfolioItem.create({ data: { title: `UI Flash ${randomUUID()}`, description: "Gotowy wzór rezerwowany w kreatorze", imageUrl: "/images/logo-white.jpg", published: true, flashEnabled: true, flashUnique: true, flashPrice: 600, flashSize: "8 cm", flashDurationMinutes: 60 } }); flashIds.push(uiFlash.id);
  const uiStart = new Date(when.getTime() + 5 * 86400000);
  const uiSlot = await prisma.availableSlot.create({ data: { startsAt: uiStart, endsAt: new Date(uiStart.getTime() + 3600000), isPublic: true, title: "Flash UI fixture" } }); flashSlotIds.push(uiSlot.id);
  await page.goto(`/app/portal/calendar?flash=${uiFlash.id}&booking=${encodeURIComponent(uiStart.toISOString())}`);
  await expect(page.getByRole("region", { name: "Wybrany wzór Flash", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "DALEJ", exact: true }).click(); await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  const required = page.getByRole("checkbox").filter({ visible: true });
  for (const checkbox of await required.all()) if (await checkbox.isEnabled() && !await checkbox.isChecked()) await checkbox.check();
  await page.getByRole("button", { name: "DALEJ", exact: true }).click();
  await page.getByRole("checkbox", { name: "Potwierdzam poprawność projektu, terminu i zaakceptowanych wersji zgód.", exact: true }).check();
  const created = page.waitForResponse(response => response.url().endsWith("/api/client/appointments") && response.request().method() === "POST");
  await page.getByRole("button", { name: "WYŚLIJ PROŚBĘ O WIZYTĘ", exact: true }).click(); expect((await created).status()).toBe(201);
  expect(await prisma.tattooProject.count({ where: { flashPortfolioId: uiFlash.id } })).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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
    await expect(editor.getByText(consent.title, { exact: true })).toBeVisible();
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
    await ownPage.getByRole("button", { name: "WEJDŹ DO KONTA", exact: true }).click();
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
