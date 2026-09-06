import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for production migrations.");
  process.exit(1);
}

let migrationUrl;
try {
  migrationUrl = new URL(databaseUrl);
} catch {
  console.error("DATABASE_URL is not a valid PostgreSQL URL.");
  process.exit(1);
}

// Vercel cannot reach Supabase's IPv6-only direct endpoint. Prisma migrations
// need session semantics, so use Supavisor session mode rather than the
// transaction pool used by the serverless application.
if (migrationUrl.hostname.endsWith(".pooler.supabase.com") && migrationUrl.port === "6543") {
  migrationUrl.port = "5432";
}
migrationUrl.searchParams.delete("pgbouncer");
migrationUrl.searchParams.delete("connection_limit");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  env: { ...process.env, DIRECT_URL: migrationUrl.toString() },
  stdio: "inherit",
});

if (result.error) console.error("Could not start Prisma migrations.");
process.exit(result.status ?? 1);
