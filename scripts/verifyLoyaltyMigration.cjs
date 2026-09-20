const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("fs");
const { randomUUID } = require("crypto");
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");
const values = loadDryRunEnvironment();
requireTestProject(values);
process.env.DATABASE_URL = requireTestDatabase(values);
const prisma = new PrismaClient();
const schema = `loyalty_test_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_TEST_SCHEMA");
async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "Client" ("id" TEXT PRIMARY KEY)');
      await tx.$executeRawUnsafe('CREATE TABLE "Appointment" ("id" TEXT PRIMARY KEY)');
      const sql = readFileSync("prisma/migrations/20260919180000_loyalty_ledger/migration.sql", "utf8");
      for (const statement of sql.split(";").map((value) => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRaw`SELECT relrowsecurity FROM pg_class WHERE oid = '"LoyaltyEntry"'::regclass`;
      if (!rows[0]?.relrowsecurity) throw new Error("Loyalty migration did not enable RLS");
      await tx.$executeRawUnsafe(`INSERT INTO "Client" (id) VALUES ('client')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Appointment" (id) VALUES ('visit')`);
      await tx.$executeRawUnsafe(`INSERT INTO "LoyaltyEntry" (id, "clientId", "appointmentId", key, kind, stamps, note, "adminId") VALUES ('entry', 'client', 'visit', 'visit:visit', 'visit', 1, 'test', 'admin')`);
      for (const statement of [
        `UPDATE "LoyaltyEntry" SET "discountCents" = 70001, "grossCents" = 140000, "paidCents" = 69999`,
        `UPDATE "LoyaltyEntry" SET stamps = 6`,
        `UPDATE "LoyaltyEntry" SET "paidCents" = 1`,
      ]) {
        await tx.$executeRawUnsafe("SAVEPOINT invalid_value");
        let rejected = false;
        try { await tx.$executeRawUnsafe(statement); } catch { rejected = true; }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT invalid_value");
        if (!rejected) throw new Error("Loyalty database constraint missing");
      }
      await tx.$executeRawUnsafe(`DELETE FROM "Appointment" WHERE id = 'visit'`);
      const settingsSql = readFileSync("prisma/migrations/20260920090000_configurable_loyalty/migration.sql", "utf8");
      for (const statement of settingsSql.split(";").map((value) => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      await tx.$executeRawUnsafe(`UPDATE "LoyaltyEntry" SET stamps = -8, "grossCents" = 200000, "discountCents" = 90000, "paidCents" = 110000`);
      for (const statement of [
        `UPDATE "LoyaltyEntry" SET stamps = -51`,
        `UPDATE "LoyaltyEntry" SET "discountCents" = 200001, "paidCents" = -1`,
      ]) {
        await tx.$executeRawUnsafe("SAVEPOINT settings_invalid");
        let rejected = false;
        try { await tx.$executeRawUnsafe(statement); } catch { rejected = true; }
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT settings_invalid");
        if (!rejected) throw new Error("Configurable loyalty constraint missing");
      }
      const entries = await tx.$queryRawUnsafe('SELECT "appointmentId" FROM "LoyaltyEntry"');
      if (entries.length !== 1 || entries[0].appointmentId !== null) throw new Error("Deleting a project erased loyalty history");
      await tx.$executeRawUnsafe('CREATE TABLE "TattooProject" ("id" TEXT PRIMARY KEY)');
      const workflowSql = readFileSync("prisma/migrations/20260920091000_workflow_extensions/migration.sql", "utf8");
      for (const statement of workflowSql.split(";").map((value) => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      await tx.$executeRawUnsafe(`INSERT INTO "TattooProject" (id, "estimatedSessionsMin", "estimatedSessionsMax", "sessionPriceCents") VALUES ('project', 2, 4, 140000)`);
      const oldClient = await tx.$queryRawUnsafe('SELECT "bookingDraft" FROM "Client"');
      if (oldClient.length !== 1 || oldClient[0].bookingDraft !== null) throw new Error("Workflow migration changed existing client data");
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback && error.message !== rollback.message) throw error; }
  console.log("PASS loyalty migration: SQL, constraints, RLS and retained history; test schema rolled back");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
