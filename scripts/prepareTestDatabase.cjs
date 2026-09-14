const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadDryRunEnvironment, requireTestDatabase, requireTestProject } = require("./dryRunTestEnv.cjs");

const root = path.resolve(__dirname, "..");
const values = loadDryRunEnvironment();
const databaseUrl = requireTestDatabase(values);
requireTestProject(values);

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
};
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(npx, args, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

// Ten projekt jest przeznaczony wyłącznie do testów. Reset omija historyczne
// migracje delta, które powstały po pierwszym utworzeniu produkcyjnej bazy.
run(["prisma", "db", "push", "--force-reset", "--accept-data-loss"]);

// Prisma odtwarza schemat, a te migracje dodają zabezpieczenia specyficzne dla
// Supabase: blokadę Data API i prywatny magazyn inspiracji.
for (const migration of [
  "20260825050000_lock_down_public_data_api",
  "20260912200000_private_inspiration_storage",
]) {
  run([
    "prisma",
    "db",
    "execute",
    "--file",
    path.join("prisma", "migrations", migration, "migration.sql"),
    "--schema",
    path.join("prisma", "schema.prisma"),
  ]);
}

const migrationRoot = path.join(root, "prisma", "migrations");
const migrations = fs.readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const migration of migrations) run(["prisma", "migrate", "resolve", "--applied", migration]);
run(["prisma", "migrate", "status"]);
