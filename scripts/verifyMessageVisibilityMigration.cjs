const { PrismaClient } = require("@prisma/client");
const { readFileSync } = require("fs");
const { randomUUID } = require("crypto");
const assert = require("node:assert/strict");
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");
const values = loadDryRunEnvironment();
requireTestProject(values);
process.env.DATABASE_URL = requireTestDatabase(values);
const prisma = new PrismaClient();
const schema = `visibility_test_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_VISIBILITY_TEST");
async function main() {
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const table of ["ProjectMessage", "DirectMessage"]) {
        await tx.$executeRawUnsafe(`CREATE TABLE "${table}" (id TEXT PRIMARY KEY, body TEXT NOT NULL, "imageUrl" TEXT)`);
        await tx.$executeRawUnsafe(`INSERT INTO "${table}" VALUES ('message', 'preserved history', 'private/retained.webp')`);
      }
      const sql = readFileSync("prisma/migrations/20260930010000_message_visibility/migration.sql", "utf8");
      for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      for (const table of ["ProjectMessage", "DirectMessage"]) {
        const hide = recipient => tx.$executeRawUnsafe(`UPDATE "${table}" SET "hiddenFor" = array_append("hiddenFor", $1) WHERE NOT ("hiddenFor" @> ARRAY[$1]::TEXT[])`, recipient);
        assert.equal(await hide("client:a"), 1);
        assert.equal(await hide("client:a"), 0);
        assert.equal(await hide("admin:a"), 1);
        const [row] = await tx.$queryRawUnsafe(`SELECT *, NOT ("hiddenFor" @> ARRAY['admin:b']::TEXT[]) AS "visibleToOtherAdmin" FROM "${table}"`);
        assert.deepEqual(row.hiddenFor, ["client:a", "admin:a"]);
        assert.equal(row.body, "preserved history");
        assert.equal(row.imageUrl, "private/retained.webp");
        assert.equal(row.visibleToOtherAdmin, true);
      }
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS message visibility migration: history/media retained, independent recipients, idempotent hides; test schema rolled back");
}
main().catch(() => { console.error("Message visibility migration verification failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
