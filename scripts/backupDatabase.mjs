import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const url = process.env.DATABASE_DIRECT_URL;
if (!url) throw new Error("Missing DATABASE_DIRECT_URL");
const prisma = new PrismaClient({ datasources: { db: { url } }, log: [] });
// libpq does not accept Prisma-specific URL options.
const libpq = new URL(url);
for (const key of ["schema", "connection_limit", "pool_timeout", "pgbouncer"]) libpq.searchParams.delete(key);
const env = { ...process.env, PGHOST: libpq.hostname, PGPORT: libpq.port || "5432", PGUSER: decodeURIComponent(libpq.username), PGPASSWORD: decodeURIComponent(libpq.password), PGDATABASE: decodeURIComponent(libpq.pathname.slice(1)), ...(libpq.searchParams.has("sslmode") ? { PGSSLMODE: libpq.searchParams.get("sslmode") } : {}) };
const quote = value => `"${value.replaceAll('"', '""')}"`;

let stage = "connect";
try {
  await prisma.$transaction(async tx => {
    stage = "snapshot";
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const [{ snapshot }] = await tx.$queryRawUnsafe("SELECT pg_export_snapshot() AS snapshot");
    const tables = await tx.$queryRawUnsafe("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    for (const required of ["Client", "TattooProject", "Appointment"]) {
      if (!tables.some(t => t.tablename === required)) throw new Error("Wrong backup source: required CoolInk tables absent");
    }
    stage = "dump";
    await run("pg_dump", ["--format=custom", "--schema=public", "--no-owner", "--no-privileges", `--snapshot=${snapshot}`, "--file=production.dump"], { env, timeout: 600000 });
    stage = "counts";
    const counts = [];
    for (const { tablename } of tables) {
      const [{ count }] = await tx.$queryRawUnsafe(`SELECT count(*)::text AS count FROM public.${quote(tablename)}`);
      counts.push(`${tablename}=${count}`);
    }
    await writeFile("expected-counts.txt", counts.join("\n") + "\n", { mode: 0o600 });
    stage = "auth-source-discovery";
    let authSource = null;
    const [{ available }] = await tx.$queryRawUnsafe("SELECT to_regclass('auth.users') IS NOT NULL AS available");
    if (available) {
      const [coverage] = await tx.$queryRawUnsafe(`SELECT
        (SELECT count(*)::int FROM auth.users) AS "authUsers",
        count(*)::int AS "linkedClients",
        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id::text = c."supabaseUserId"))::int AS "matchingClients"
        FROM public."Client" c WHERE c."supabaseUserId" IS NOT NULL`);
      authSource = { ...coverage, confirmed: coverage.linkedClients > 0 && coverage.linkedClients === coverage.matchingClients };
      console.log("Auth source coverage (aggregate only)", authSource);
    }
    if (process.env.BACKUP_REQUIRE_AUTH === "1" && !authSource?.confirmed) throw new Error("Unconfirmed Auth source");
    // Separate managed-schema archive: retain recovery data without blindly replacing
    // platform-managed Auth/storage schemas in a live Supabase destination.
    stage = "protected-schema-dump";
    const protectedTables = await tx.$queryRawUnsafe("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE schemaname IN ('auth', 'storage') ORDER BY schemaname, tablename");
    const protectedSchemas = [...new Set(protectedTables.map(table => table.schemaname))];
    const schemaArgs = protectedSchemas.length ? protectedSchemas.map(schema => `--schema=${schema}`) : ["--exclude-schema=*"];
    await run("pg_dump", ["--format=custom", ...schemaArgs, "--no-owner", "--no-privileges", `--snapshot=${snapshot}`, "--file=protected.dump"], { env, timeout: 600000 });
    const protectedCounts = [];
    for (const { schemaname, tablename } of protectedTables) {
      const [{ count }] = await tx.$queryRawUnsafe(`SELECT count(*)::text AS count FROM ${quote(schemaname)}.${quote(tablename)}`);
      protectedCounts.push(`${schemaname}.${tablename}=${count}`);
    }
    await writeFile("protected-counts.txt", protectedCounts.join("\n") + "\n", { mode: 0o600 });
    await writeFile("database-backup.json", JSON.stringify({ version: 3, scope: ["public", "auth", "storage"], authSource, protectedTableCount: protectedTables.length, snapshot, createdAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || null }), { mode: 0o600 });
  }, { isolationLevel: "RepeatableRead", timeout: 900000, maxWait: 30000 });
  stage = "archive-validation";
  await run("pg_restore", ["--list", "production.dump"], { env, timeout: 30000 });
  await run("pg_restore", ["--list", "protected.dump"], { env, timeout: 30000 });
  console.log("PASS database dump and row counts use the same exported snapshot");
} catch {
  // Child-process errors contain arguments and database diagnostics. Never log them.
  console.error(`Database backup failed at ${stage}; archive must not be published.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
