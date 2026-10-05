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

async function verifyCalendarPresentation(page) {
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
  await prisma.client.deleteMany({ where: { email } });
  await prisma.$executeRawUnsafe("DELETE FROM auth.users WHERE email = $1", email);
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

test("admin login, client card rendering and logout", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("EMAIL", { exact: true }).fill(`admin-${email}`);
  await page.getByLabel("HASŁO", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ZALOGUJ SIĘ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/calendar");
  await verifyCalendarPresentation(page);
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  await page.goto(`/admin/clients/${client.id}`);
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "EDYTUJ DANE", exact: true }).click();
  await expect(page.getByLabel("E-MAIL", { exact: false })).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "ANULUJ", exact: true }).click();
  const sessionProject = await prisma.tattooProject.create({ data: { clientId: client.id, title: "Browser session ordering", description: "Disposable UI regression" } });
  const oldVisit = await prisma.appointment.create({ data: { projectId: sessionProject.id, startsAt: new Date(Date.now() - 172800000), endsAt: new Date(Date.now() - 169200000), status: "completed", price: 900 } });
  const newVisit = await prisma.appointment.create({ data: { projectId: sessionProject.id, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() - 82800000), status: "confirmed", price: 1400 } });
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
  cmsPage = await prisma.page.create({ data: { title: "Browser CMS fixture", slug: `browser-cms-${randomUUID()}`, status: "draft", showInNav: false } });
  const visitor = await page.context().browser().newContext();
  const publicPage = await visitor.newPage();
  try {
    expect((await publicPage.goto(`http://127.0.0.1:3120/${cmsPage.slug}`)).status()).toBe(404);
    await page.goto(`/admin/pages/${cmsPage.id}`);
    await expect(page.getByRole("complementary", { name: "Nawigator struktury strony" })).toHaveCount(0);
    await page.getByRole("button", { name: /Hero · swobodny/ }).click();
    await expect(page.locator(".builder-canvas").getByRole("heading", { name: "Twój pomysł. Twój styl.", exact: true })).toBeVisible();
    await page.locator(".builder-canvas").getByRole("heading", { name: "Twój pomysł. Twój styl.", exact: true }).click();
    await page.getByRole("tab", { name: "STYL", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Typografia", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Ustawienia: Typografia", exact: true }).click();
    const typography = page.getByRole("dialog", { name: "Typografia", exact: true });
    await expect(typography).toBeVisible();
    const popupFits = await typography.evaluate((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; });
    expect(popupFits).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Ustawienia: Typografia", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Ustawienia: KOLOR TEKSTU — kolory globalne", exact: true }).click();
    await page.getByRole("dialog", { name: "KOLOR TEKSTU — kolory globalne", exact: true }).getByRole("button", { name: "Akcent", exact: true }).click();
    await page.keyboard.press("Escape");
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
