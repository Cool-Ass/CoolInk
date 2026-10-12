const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");
const values = loadDryRunEnvironment();
requireTestProject(values);
const prisma = new PrismaClient({ datasources: { db: { url: requireTestDatabase(values) } } });
const schema = `visit_deposit_test_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_VISIT_DEPOSIT_TEST");
async function main() {
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "TattooProject" (id TEXT PRIMARY KEY, "depositStatus" TEXT, "depositAmount" INTEGER, "depositPaidAt" TIMESTAMP(3), "depositPaymentMethod" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "Appointment" (id TEXT PRIMARY KEY, "projectId" TEXT, status TEXT)');
      await tx.$executeRawUnsafe(`INSERT INTO "TattooProject" VALUES ('p', 'paid', 300, '2026-01-01', 'BLIK')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Appointment" VALUES ('v1', 'p', 'completed'), ('v2', 'p', 'confirmed')`);
      // Avoid reusing a SELECT * prepared plan across an ALTER TABLE result-shape change.
      const before = await tx.$queryRawUnsafe('SELECT id, "depositStatus", "depositAmount", "depositPaidAt", "depositPaymentMethod" FROM "TattooProject"');
      const sql = readFileSync("prisma/migrations/20261013010000_visit_deposits/migration.sql", "utf8");
      for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRawUnsafe('SELECT * FROM "Appointment" ORDER BY id');
      assert.equal(rows.length, 2);
      for (const row of rows) { assert.equal(row.depositStatus, "not_required"); assert.equal(row.depositAmount, null); assert.equal(row.depositPaidAt, null); assert.equal(row.depositPaymentMethod, null); }
      const [project] = await tx.$queryRawUnsafe('SELECT * FROM "TattooProject"');
      assert.deepEqual(project, { ...before[0], depositAssignedAppointmentId: null });
      await tx.$executeRawUnsafe(`UPDATE "Appointment" SET "depositStatus"='paid', "depositAmount"=300 WHERE id='v1'`);
      await tx.$executeRawUnsafe(`UPDATE "TattooProject" SET "depositAssignedAppointmentId"='v1' WHERE id='p'`);
      const [sibling] = await tx.$queryRawUnsafe(`SELECT * FROM "Appointment" WHERE id='v2'`);
      assert.equal(sibling.depositAmount, null);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS visit deposit migration: preserved legacy payments, no guessed assignment, independent visits; isolated fixtures rolled back");
}
main().catch(() => { console.error("Visit deposit migration verification failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
