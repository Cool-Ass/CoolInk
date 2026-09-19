/* Isolated test database only. Does not read production credentials. */
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("./dryRunTestEnv.cjs");
const values = loadDryRunEnvironment();
requireTestProject(values);
process.env.DATABASE_URL = requireTestDatabase(values);
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3120";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error("Only a local test server is allowed.");
const assert = (value, message) => { if (!value) throw new Error(message); };
const tag = `loyalty-${randomUUID()}`;

async function main() {
  let admin, client;
  const password = `Test!${randomUUID()}`;
  try {
    admin = await prisma.adminUser.create({ data: { name: "Loyalty test", email: `${tag}@example.test`, passwordHash: await bcrypt.hash(password, 12), role: "owner" } });
    client = await prisma.client.create({ data: { firstName: "Loyalty", lastName: "Test", email: `client-${tag}@example.test` } });
    const project = await prisma.tattooProject.create({ data: { clientId: client.id, title: tag, description: "Isolated loyalty test" } });
    const login = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email: admin.email, password }) });
    assert(login.status === 200, `Login failed: ${login.status}`);
    const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const call = (body, suffix = client.id) => fetch(`${base}/api/admin/clients/${suffix}/loyalty`, { method: "POST", headers: { cookie, origin: base, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const balance = async () => (await prisma.loyaltyEntry.aggregate({ where: { clientId: client.id, voidedAt: null }, _sum: { stamps: true } }))._sum.stamps || 0;
    const visits = [];
    for (let index = 0; index < 8; index++) visits.push(await prisma.appointment.create({ data: { projectId: project.id, status: "completed", serviceType: "tattoo", startsAt: new Date(`2025-01-${String(index + 10).padStart(2, "0")}T10:00:00Z`), endsAt: new Date(`2025-01-${String(index + 10).padStart(2, "0")}T12:00:00Z`) } }));
    const settlement = (index, grossCents = 140000, redeem = false) => ({ action: "settle", appointmentId: visits[index].id, grossCents, redeem, paid: true });
    assert((await call(settlement(0), "not-this-client")).status === 409, "Cross-client access accepted");
    assert((await call(settlement(0, 60000))).status === 200, "600 PLN settlement failed");
    assert(await balance() === 0, "600 PLN incorrectly earned a stamp");
    assert((await call({ action: "paper", stamps: 4, note: "Isolated paper import" })).status === 200, "Paper import failed");
    const duplicates = await Promise.all([call(settlement(1)), call(settlement(1))]);
    assert(duplicates.every((response) => response.status === 200), "Idempotent concurrent settlement failed");
    assert(await balance() === 5, "Duplicate stamp awarded");
    assert(await prisma.clientNotification.count({ where: { clientId: client.id, title: "Masz rabat −50% na tatuaż!" } }) === 1, "Duplicate reward notification");
    const redemptions = await Promise.all([call(settlement(2, 140000, true)), call(settlement(3, 80000, true))]);
    assert(redemptions.filter((response) => response.status === 200).length === 1 && redemptions.filter((response) => response.status === 409).length === 1, "Reward redeemed concurrently twice");
    assert(await balance() === 0, "Redemption balance incorrect");
    const redeemed = await prisma.loyaltyEntry.findFirstOrThrow({ where: { clientId: client.id, stamps: -5 } });
    assert(redeemed.discountCents <= 70000 && redeemed.paidCents === redeemed.grossCents - redeemed.discountCents, "Discount arithmetic failed");
    const stamp = await prisma.loyaltyEntry.findFirstOrThrow({ where: { clientId: client.id, stamps: 1 } });
    assert((await call({ action: "void", entryId: stamp.id, note: "Test reversal" })).status === 409, "Spent stamp reversed");
    const cancel = await fetch(`${base}/api/admin/appointments/${redeemed.appointmentId}`, { method: "DELETE", headers: { cookie, origin: base } });
    assert(cancel.status === 409, "Settled appointment cancellation accepted");
    assert((await call({ action: "void", entryId: redeemed.id, note: "Test refund" })).status === 200, "Refund failed");
    assert(await balance() === 5, "Reward not returned");
    assert((await call({ action: "void", entryId: redeemed.id, note: "Retry refund" })).status === 200 && await balance() === 5, "Duplicate refund changed balance");
    assert((await call(settlement(4, 280000, true))).status === 200, "Capped redemption failed");
    const capped = await prisma.loyaltyEntry.findUniqueOrThrow({ where: { appointmentId: visits[4].id } });
    assert(capped.discountCents === 70000 && capped.paidCents === 210000, "700 PLN cap failed");
    for (const path of [`/admin/clients/${client.id}`, "/admin"]) assert((await fetch(`${base}${path}`, { headers: { cookie } })).status === 200, `Page failed: ${path}`);
    console.log("PASS loyalty: threshold, import, concurrency, idempotency, refund, cap, ownership and admin rendering");
  } finally {
    if (client) await prisma.client.delete({ where: { id: client.id } });
    if (admin) await prisma.adminUser.delete({ where: { id: admin.id } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
