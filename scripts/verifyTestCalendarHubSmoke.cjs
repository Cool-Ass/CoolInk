/* HTTP + Prisma smoke test for Calendar Hub on the isolated test project only. */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { loadDryRunEnvironment, requireTestProject } = require("./dryRunTestEnv.cjs");

const prisma = new PrismaClient();
const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3120").replace(/\/$/, "");
const tag = `calendar-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const assert = (value, message) => { if (!value) throw new Error(message); };
const cookieOf = (response) => (response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean)).map((value) => value.split(";", 1)[0]).join("; ");

async function call(path, options = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, { ...options, headers: { ...(cookie ? { cookie } : {}), ...(options.headers || {}) } });
  const raw = await response.text();
  return { response, json: raw ? JSON.parse(raw) : null };
}
async function request(path, body, cookie, method = "POST") {
  return call(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, cookie);
}

async function main() {
  requireTestProject(loadDryRunEnvironment());
  const password = `CoolInk!${randomUUID()}A1`;
  const admin = await prisma.adminUser.create({ data: { email: `${tag}@example.test`, name: "Calendar smoke", passwordHash: await bcrypt.hash(password, 12) } });
  const ids = { slots: [], promotions: [], events: [], blocks: [], overrides: [] };
  try {
    const login = await request("/api/admin/login", { email: admin.email, password });
    assert(login.response.status === 200, `admin login returned ${login.response.status}`);
    const cookie = cookieOf(login.response);
    assert(cookie.includes("coolink_admin_session="), "admin login did not establish a session");

    const start = "2037-02-10T10:00:00.000Z";
    const end = "2037-02-10T11:00:00.000Z";
    const nextStart = "2037-02-11T10:00:00.000Z";
    const nextEnd = "2037-02-11T11:00:00.000Z";

    const slot = await request("/api/admin/calendar-items", { kind: "freeTerm", startsAt: start, endsAt: end, title: tag, description: "<p>Opis <strong>terminu</strong></p>", color: "#10B981", icon: "check", isPublic: true }, cookie);
    assert(slot.response.status === 201, `available slot create returned ${slot.response.status}`);
    const createdSlot = await prisma.availableSlot.findFirstOrThrow({ where: { title: tag } }); ids.slots.push(createdSlot.id);
    assert(createdSlot.isPublic && createdSlot.icon === "check", "available slot was not stored as public with its icon");
    const editedSlot = await request("/api/admin/calendar-items", { id: createdSlot.id, kind: "freeTerm", startsAt: start, endsAt: end, title: `${tag}-edited`, description: "<p>Zmiana</p>", color: "#2563EB", icon: "heart", isPublic: false }, cookie, "PATCH");
    assert(editedSlot.response.status === 200 && editedSlot.json.item.isPublic === false, "available slot edit failed");

    const bulkSlot = await request("/api/admin/calendar-items", { kind: "freeTerm", startsAt: nextStart, endsAt: nextEnd, dates: ["2037-02-11", "2037-02-12"], title: `${tag}-bulk`, color: "#10B981", icon: "check", isPublic: true }, cookie);
    assert(bulkSlot.response.status === 201, `available slot bulk create returned ${bulkSlot.response.status}`);
    const bulkSlots = await prisma.availableSlot.findMany({ where: { title: `${tag}-bulk` } }); ids.slots.push(...bulkSlots.map((item) => item.id));
    assert(bulkSlots.length === 2, "available slot bulk create did not create two records");

    const promotion = await request("/api/admin/calendar-items", { kind: "promotion", startsAt: start, endsAt: end, title: `${tag} promo`, description: "<p>Promocja <em>bezpieczna</em></p>", badge: "PROMO", color: "#C99A4A", icon: "sparkles", promoCode: "TEST", ctaLabel: "Sprawdź", ctaUrl: "/app", isPublic: true, active: true }, cookie);
    assert(promotion.response.status === 201, `promotion create returned ${promotion.response.status}`);
    const createdPromotion = await prisma.promotion.findFirstOrThrow({ where: { title: `${tag} promo` } }); ids.promotions.push(createdPromotion.id);
    assert(createdPromotion.badge === "PROMO" && createdPromotion.icon === "sparkles", "promotion badge or icon was not stored");
    const editedPromotion = await request("/api/admin/calendar-items", { id: createdPromotion.id, kind: "promotion", startsAt: start, endsAt: end, title: `${tag} promo edited`, description: "<p>Nowa promocja</p>", badge: "EDYCJA", color: "#2563EB", icon: "star", isPublic: false, active: true }, cookie, "PATCH");
    assert(editedPromotion.response.status === 200 && editedPromotion.json.item.badge === "EDYCJA", "promotion edit failed");

    const event = await request("/api/admin/calendar-items", { kind: "event", startsAt: start, endsAt: end, title: `${tag} event`, description: "<p>Wydarzenie</p>", allDay: false, color: "#6B7280", icon: "circle", label: "Studio", isPublic: true }, cookie);
    assert(event.response.status === 201, `event create returned ${event.response.status}`);
    const createdEvent = await prisma.calendarEvent.findFirstOrThrow({ where: { title: `${tag} event` } }); ids.events.push(createdEvent.id);
    const editedEvent = await request("/api/admin/calendar-items", { id: createdEvent.id, kind: "event", startsAt: start, endsAt: end, title: `${tag} event edited`, allDay: true, color: "#2563EB", icon: "check", label: "Edycja", isPublic: false }, cookie, "PATCH");
    assert(editedEvent.response.status === 200 && editedEvent.json.item.allDay === true, "event edit failed");

    const dayOff = await request("/api/admin/calendar-items", { kind: "dayOff", startsAt: "2037-02-15T00:00:00.000Z", endsAt: "2037-02-16T00:00:00.000Z", reason: tag }, cookie);
    assert(dayOff.response.status === 201, `day off create returned ${dayOff.response.status}`);
    ids.blocks.push(dayOff.json.item.id);
    const editedDayOff = await request("/api/admin/calendar-items", { id: dayOff.json.item.id, kind: "dayOff", startsAt: "2037-02-15T00:00:00.000Z", endsAt: "2037-02-16T00:00:00.000Z", reason: `${tag} edited` }, cookie, "PATCH");
    assert(editedDayOff.response.status === 200, "day off edit failed");

    const overrideSmokeStartedAt = new Date();
    const hours = await request("/api/admin/calendar-items", { kind: "workingHours", dates: ["2037-02-20", "2037-02-21"], hours: { enabled: true, startsAt: "10:00", endsAt: "18:00", breakStart: "13:00", breakEnd: "13:30" } }, cookie);
    assert(hours.response.status === 200, `working hours bulk create returned ${hours.response.status}`);
    const overrides = await prisma.workingHoursOverride.findMany({ where: { date: { gte: new Date("2037-02-19T00:00:00.000Z"), lt: new Date("2037-02-22T00:00:00.000Z") }, createdAt: { gte: overrideSmokeStartedAt } } }); ids.overrides.push(...overrides.map((item) => item.id));
    assert(overrides.length === 2, "working hours bulk create did not create two overrides");
    const editedHours = await request("/api/admin/calendar-items", { id: overrides[0].id, kind: "workingHours", hours: { enabled: false, startsAt: "10:00", endsAt: "18:00" } }, cookie, "PATCH");
    assert(editedHours.response.status === 200 && editedHours.json.item.enabled === false, "working hours edit/disable failed");

    for (const [kind, id] of [["freeTerm", createdSlot.id], ["promotion", createdPromotion.id], ["event", createdEvent.id], ["dayOff", dayOff.json.item.id], ["workingHours", overrides[0].id]]) {
      const deleted = await call(`/api/admin/calendar-items?kind=${kind}&id=${id}`, { method: "DELETE" }, cookie);
      assert(deleted.response.status === 200, `${kind} direct delete returned ${deleted.response.status}`);
    }
    ids.slots = ids.slots.filter((id) => id !== createdSlot.id); ids.promotions = []; ids.events = []; ids.blocks = []; ids.overrides = ids.overrides.filter((id) => id !== overrides[0].id);
    console.log("PASS: Calendar Hub creates, edits and deletes available slots, promotions, events, day off and working-hours overrides; multi-day slot/hours actions and public/private fields work through the protected admin endpoint.");
  } finally {
    await prisma.availableSlot.deleteMany({ where: { id: { in: ids.slots } } });
    await prisma.promotion.deleteMany({ where: { id: { in: ids.promotions } } });
    await prisma.calendarEvent.deleteMany({ where: { id: { in: ids.events } } });
    await prisma.availabilityBlock.deleteMany({ where: { id: { in: ids.blocks } } });
    await prisma.workingHoursOverride.deleteMany({ where: { id: { in: ids.overrides } } });
    await prisma.adminUser.delete({ where: { id: admin.id } }).catch(() => null);
    await prisma.$disconnect();
  }
}

main().catch(async (error) => { console.error(`FAIL: ${error.message}`); await prisma.$disconnect(); process.exitCode = 1; });
