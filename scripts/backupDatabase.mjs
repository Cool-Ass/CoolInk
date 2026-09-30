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
    await writeFile("database-backup.json", JSON.stringify({ version: 2, scope: "public", snapshot, createdAt: new Date().toISOString(), commit: process.env.GITHUB_SHA || null }), { mode: 0o600 });
  }, { isolationLevel: "RepeatableRead", timeout: 900000, maxWait: 30000 });
  stage = "archive-validation";
  await run("pg_restore", ["--list", "production.dump"], { env, timeout: 30000 });
  console.log("PASS database dump and row counts use the same exported snapshot");
} catch {
  // Child-process errors contain arguments and database diagnostics. Never log them.
  console.error(`Database backup failed at ${stage}; archive must not be published.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
