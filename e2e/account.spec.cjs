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
  await prisma.availabilityBlock.deleteMany({ where: { id: { in: blockIds } } });
  await prisma.client.deleteMany({ where: { email } });
  await prisma.$executeRawUnsafe("DELETE FROM auth.users WHERE email = $1", email);
  await prisma.contactMessage.deleteMany({ where: { email } });
  if (slot) await prisma.availableSlot.delete({ where: { id: slot.id } });
  if (consent) await prisma.studioDocument.delete({ where: { id: consent.id } });
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
  await prisma.tattooProject.create({ data: { clientId: client.id, title: projectTitle, description: "Isolated browser fixture" } });
  await page.goto("/app/portal/projects");
  await expect(page.getByText(projectTitle, { exact: true }).first()).toBeVisible();
  const denied = await page.request.get("/api/admin/google-calendar/calendars");
  expect([401, 403]).toContain(denied.status());
  await page.goto("/app/portal/calendar");
  await expect(page.getByText("ZAJĘTY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("NIEDOSTĘPNY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("private-browser-note", { exact: false })).toHaveCount(0);
  // Exercise all four reservation steps through the actual responsive UI.
  await page.goto(`/app/portal/calendar?booking=${encodeURIComponent(slot.startsAt.toISOString())}`);
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
  await page.goto("/app/portal/projects");
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
  const client = await prisma.client.findUniqueOrThrow({ where: { email } });
  await page.goto(`/admin/clients/${client.id}`);
  await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "EDYTUJ DANE", exact: true }).click();
  await expect(page.getByLabel("E-MAIL", { exact: false })).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "ANULUJ", exact: true }).click();
  await page.getByRole("button", { name: "WYLOGUJ", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
});
