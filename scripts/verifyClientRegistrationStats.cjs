const { PrismaClient, Prisma } = require("@prisma/client");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const { require: tsRequire } = require("tsx/cjs/api");
const { getClientRegistrationStats } = tsRequire("../lib/clientRegistrationStats.ts", __filename);
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");
const values = loadDryRunEnvironment();
requireTestProject(values);
const prisma = new PrismaClient({ datasources: { db: { url: requireTestDatabase(values) } } });
const schema = `registration_test_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_REGISTRATION_TEST");
async function main() {
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, created_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ)');
      await tx.$executeRawUnsafe('CREATE TABLE "Client" (id TEXT PRIMARY KEY, "supabaseUserId" TEXT UNIQUE)');
      await tx.$executeRawUnsafe('CREATE TABLE "TattooProject" (id TEXT PRIMARY KEY, "clientId" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "Appointment" (id TEXT PRIMARY KEY, "projectId" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "AccountDeletionRequest" ("clientId" TEXT)');
      await tx.$executeRawUnsafe(`INSERT INTO users VALUES
        ('unlinked', 'unlinked@example.test', '2026-10-02', NULL),
        ('idle', 'idle@example.test', '2026-10-02', NULL),
        ('project', 'project@example.test', '2026-10-02', NULL),
        ('booked', 'booked@example.test', '2026-10-02', NULL),
        ('older', 'older@example.test', '2026-09-01', NULL),
        ('privacy', 'privacy@example.test', '2026-10-02', NULL),
        ('deleted', 'deleted@example.test', '2026-10-02', '2026-10-03'),
        ('anonymous', NULL, '2026-10-02', NULL)`);
      await tx.$executeRawUnsafe(`INSERT INTO "Client" VALUES
        ('manual', NULL), ('idle', 'idle'), ('project', 'project'),
        ('booked', 'booked'), ('privacy', 'privacy')`);
      await tx.$executeRawUnsafe(`INSERT INTO "TattooProject" VALUES ('p1', 'project'), ('b1', 'booked'), ('b2', 'booked')`);
      await tx.$executeRawUnsafe(`INSERT INTO "Appointment" VALUES ('a1', 'b1'), ('a2', 'b2')`);
      await tx.$executeRawUnsafe(`INSERT INTO "AccountDeletionRequest" VALUES ('privacy')`);
      // Same application SQL and bound values, routed only to the isolated
      // disposable schema. Never read or write real Auth accounts.
      const db = { $queryRaw: (strings, ...params) => tx.$queryRaw(Prisma.sql(
        strings.map(text => text.replaceAll("public.", `"${schema}".`).replaceAll("auth.users", `"${schema}".users`)), ...params,
      )) };
      assert.deepEqual(await getClientRegistrationStats(db, new Date("2026-10-01"), new Date("2026-10-09")), { total: 4, withoutProject: 2, withoutAppointment: 3 });
      assert.deepEqual(await getClientRegistrationStats(db, new Date("2026-11-01"), new Date("2026-11-09")), { total: 0, withoutProject: 0, withoutAppointment: 0 });
      throw rollback;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  console.log("PASS registration aggregates: unlinked accounts included, contacts excluded, overlapping groups, no project double counting, privacy and date filters; test schema rolled back");
}
main().catch(() => { console.error("Registration aggregate verification failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
