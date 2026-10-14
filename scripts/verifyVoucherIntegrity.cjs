const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");
const env = loadDryRunEnvironment(); requireTestProject(env);
process.env.DATABASE_URL = requireTestDatabase(env);
const prisma = new PrismaClient();
require("tsx/cjs");
const { availableVoucher } = require("../lib/vouchers.ts");
const { lockBookingCalendar } = require("../lib/bookingRules.ts");
const id = "voucher-fixture-" + randomUUID();
const code = "CI-" + randomUUID().replaceAll("-", "").toUpperCase();
const schema = "voucher_migration_" + randomUUID().replaceAll("-", "");
let stage = "migration";
async function migration() {
  const rollback = Error("ROLLBACK_VOUCHER_MIGRATION");
  try { await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
    for (const sql of ['CREATE TABLE "Client" (id TEXT PRIMARY KEY)', 'CREATE TABLE "Appointment" (id TEXT PRIMARY KEY, price INTEGER)',
      'CREATE TABLE "ProjectMessage" (id TEXT PRIMARY KEY, "readAt" TIMESTAMP(3))',
      'CREATE TABLE "DirectMessage" (id TEXT PRIMARY KEY, "readAt" TIMESTAMP(3))']) await tx.$executeRawUnsafe(sql);
    // Start from the real historical ledger constraints, not just Prisma db push.
    for (const name of ["20260919180000_loyalty_ledger", "20260920090000_configurable_loyalty"]) for (const sql of readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8").split(";").map(x => x.trim()).filter(Boolean)) await tx.$executeRawUnsafe(sql);
    await tx.$executeRawUnsafe('INSERT INTO "Client" VALUES (\'old\')');
    await tx.$executeRawUnsafe('INSERT INTO "Appointment" VALUES (\'old\', 700)');
    await tx.$executeRawUnsafe(`INSERT INTO "LoyaltyEntry" (id, "clientId", key, kind, stamps, "grossCents", "paidCents", note, "adminId") VALUES ('old', 'old', 'old', 'visit', 1, 70000, 70000, 'Historical payment', 'fixture')`);
    await tx.$executeRawUnsafe('INSERT INTO "ProjectMessage" VALUES (\'old\', \'2026-01-01\')');
    for (const name of ["20261014010000_message_delivery", "20261014020000_vouchers"]) {
      const sql = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");
      for (const statement of sql.split(";").map(x => x.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    }
    const guards = readFileSync("prisma/migrations/20261014020500_voucher_guards/migration.sql", "utf8");
    for (const statement of guards.split(";").map(x => x.trim()).filter(x => /ALTER TABLE "LoyaltyEntry"/.test(x))) await tx.$executeRawUnsafe(statement);
    const [visit] = await tx.$queryRawUnsafe('SELECT * FROM "Appointment"');
    assert.deepEqual(visit, { id: "old", price: 700, voucherRequested: false, loyaltyReserved: false, loyaltyReservation: null });
    const [entry] = await tx.$queryRawUnsafe('SELECT id, "grossCents", "discountCents", "paidCents", "voucherCents" FROM "LoyaltyEntry"');
    assert.deepEqual(entry, { id: "old", grossCents: 70000, discountCents: 0, paidCents: 70000, voucherCents: 0 });
    await tx.$executeRawUnsafe('UPDATE "LoyaltyEntry" SET "voucherCents" = 30000, "paidCents" = 40000');
    await tx.$executeRawUnsafe("SAVEPOINT invalid_receipt");
    let invalid = false; try { await tx.$executeRawUnsafe('UPDATE "LoyaltyEntry" SET "paidCents" = 70000'); } catch { invalid = true; }
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT invalid_receipt"); assert(invalid, "Voucher credit must not be counted as cash received");
    const [message] = await tx.$queryRawUnsafe('SELECT * FROM "ProjectMessage"');
    assert.equal(message.deliveredAt, null); assert.equal(message.readAt.toISOString(), "2026-01-01T00:00:00.000Z");
    throw rollback;
  }, { timeout: 30000 }); } catch (error) { if (error !== rollback) throw error; }
}
async function blocked(work) {
  let failed = false;
  try { await work(); } catch { failed = true; }
  assert(failed, "Financial guard must reject this mutation");
}
async function main() {
  try {
    await migration();
    stage = "fixtures";
    await prisma.client.create({ data: { id, firstName: "Voucher", lastName: "Fixture", email: id + "@example.test" } });
    await prisma.tattooProject.create({ data: { id, clientId: id, title: "Disposable voucher", description: "" } });
    const visits = await Promise.all(Array.from({ length: 4 }, (_, n) => prisma.appointment.create({ data: { projectId: id, startsAt: new Date("2030-01-01T10:00:00Z"), endsAt: new Date("2030-01-01T11:00:00Z"), status: "confirmed", price: 700, notes: "isolated race " + n } })));
    await prisma.voucher.create({ data: { id, issueKey: id, code, recipientName: "Voucher Fixture", amountCents: 100000, validUntil: new Date("2030-12-31"), createdById: "fixture" } });
    stage = "concurrent-reservation";
    const claims = await Promise.allSettled(visits.map(visit => prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      const voucher = await availableVoucher(tx, code, id, visit.startsAt);
      await tx.voucher.update({ where: { id: voucher.id }, data: { clientId: id, appointmentId: visit.id } });
      return visit.id;
    }, { maxWait: 30000, timeout: 15000 })));
    assert.equal(claims.filter(x => x.status === "fulfilled").length, 1);
    const voucher = await prisma.voucher.findUniqueOrThrow({ where: { id } });
    assert(voucher.appointmentId);
    stage = "link-constraints";
    await blocked(() => prisma.appointment.update({ where: { id: voucher.appointmentId }, data: { startsAt: new Date("2031-01-01") } }));
    await blocked(() => prisma.appointment.update({ where: { id: voucher.appointmentId }, data: { serviceType: "consultation" } }));
    await blocked(() => prisma.appointment.update({ where: { id: voucher.appointmentId }, data: { loyaltyReserved: true, loyaltyRequested: true, loyaltyReservation: "{}" } }));
    stage = "consumption";
    await prisma.$transaction(async tx => {
      await lockBookingCalendar(tx);
      await tx.voucher.update({ where: { id }, data: { redeemedAt: new Date(), appliedCents: 70000 } });
      await tx.appointment.update({ where: { id: voucher.appointmentId }, data: { status: "completed" } });
      await tx.loyaltyEntry.create({ data: { clientId: id, appointmentId: voucher.appointmentId, key: id, kind: "visit", stamps: 0, grossCents: 70000, paidCents: 0, discountCents: 0, voucherCents: 70000, note: "Disposable settlement", adminId: "fixture" } });
    });
    assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id } })).appliedCents, 70000, "Unused 300 PLN is forfeited, not a second balance");
    await assert.rejects(availableVoucher(prisma, code, id, new Date("2030-01-01")));
    await blocked(() => prisma.voucher.update({ where: { id }, data: { redeemedAt: null, appliedCents: 0 } }));
    await blocked(() => prisma.voucher.delete({ where: { id } }));
    await blocked(() => prisma.appointment.update({ where: { id: voucher.appointmentId }, data: { price: 600 } }));
    await blocked(() => prisma.appointment.update({ where: { id: voucher.appointmentId }, data: { status: "cancelled" } }));
    await blocked(() => prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', 'not-an-approved-request', true)`;
      await tx.voucher.delete({ where: { id } });
    }));
    stage = "ledger-constraints";
    await blocked(() => prisma.loyaltyEntry.update({ where: { key: id }, data: { discountCents: 100 } }));
    await blocked(() => prisma.loyaltyEntry.update({ where: { key: id }, data: { voucherCents: 70001 } }));
    console.log("PASS voucher migration, concurrent single claim, no stacking, forfeiture, immutable consumption, bounded privacy executor");
  } finally {
    if (await prisma.client.findUnique({ where: { id } })) await prisma.$transaction(async tx => {
      // Exact disposable test client only; use the real executor boundary, never disable guards.
      await tx.accountDeletionRequest.create({ data: { id, clientId: id, status: "executing" } });
      await tx.$executeRaw`SELECT set_config('coolink.privacy_execution', ${id}, true)`;
      await tx.voucher.deleteMany({ where: { id } });
      await tx.client.delete({ where: { id } });
    }, { timeout: 30000 });
  }
}
main().catch(() => { console.error("Voucher integrity verification failed at " + stage); process.exitCode = 1; }).finally(() => prisma.$disconnect());
