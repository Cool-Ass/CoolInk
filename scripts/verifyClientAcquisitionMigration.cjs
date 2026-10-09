const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");
const values = loadDryRunEnvironment();
requireTestProject(values);
const prisma = new PrismaClient({ datasources: { db: { url: requireTestDatabase(values) } } });
const schema = `acquisition_test_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_ACQUISITION_TEST");
async function main() {
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "Client" (id TEXT PRIMARY KEY, "supabaseUserId" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "TattooProject" (id TEXT PRIMARY KEY, "clientId" TEXT, "leadSource" TEXT, "createdAt" TIMESTAMP)');
      await tx.$executeRawUnsafe('INSERT INTO "Client" VALUES (\'known\', NULL), (\'unknown\', NULL), (\'tie\', NULL)');
      await tx.$executeRawUnsafe(`INSERT INTO "TattooProject" VALUES
        ('invalid', 'known', 'forged', '2026-01-01'),
        ('earliest', 'known', 'instagram', '2026-02-01'),
        ('latest', 'known', 'google', '2026-03-01'),
        ('unknown', 'unknown', NULL, '2026-02-01'),
        ('b', 'tie', 'facebook', '2026-02-01'),
        ('a', 'tie', 'recommendation', '2026-02-01')`);
      const sql = readFileSync("prisma/migrations/20261009040000_client_lead_source/migration.sql", "utf8");
      for (const statement of sql.split(";").map(value => value.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      const rows = await tx.$queryRawUnsafe('SELECT * FROM "Client" ORDER BY id');
      assert.equal(rows.find(row => row.id === "known").leadSource, "instagram");
      assert.equal(rows.find(row => row.id === "tie").leadSource, "recommendation");
      assert.equal(rows.find(row => row.id === "unknown").leadSource, null);
      const [{ count }] = await tx.$queryRawUnsafe('SELECT count(*)::int AS count FROM "TattooProject"');
      assert.equal(count, 6);
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS client acquisition migration: earliest valid source, deterministic ties, preserved projects; isolated fixtures rolled back");
}
main().catch(() => { console.error("Client acquisition migration verification failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
