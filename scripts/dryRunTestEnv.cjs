const fs = require("fs");
const path = require("path");

const TEST_PROJECT_REF = "cydcxgysqvrvcooboqrw";

function loadDryRunEnvironment() {
  const file = path.join(process.cwd(), ".env.dryrun.local");
  const values = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*(DRY_RUN_[A-Z0-9_]+)=(.*)$/);
      if (match) values[match[1]] = match[2].trim().replace(/^"|"$/g, "");
    }
  } else if (process.env.CI === "true") {
    for (const [key, value] of Object.entries(process.env)) if (key.startsWith("DRY_RUN_") && value) values[key] = value;
  } else {
    throw new Error("Missing .env.dryrun.local. Refusing to guess a database project.");
  }
  return values;
}

function requireTestProject(values) {
  const url = values.DRY_RUN_SUPABASE_URL;
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("Invalid isolated Supabase URL."); }
  if (parsed.origin !== `https://${TEST_PROJECT_REF}.supabase.co` || !["", "/"].includes(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`Refusing to run: DRY_RUN_SUPABASE_URL must point exactly to test project ${TEST_PROJECT_REF}.`);
  }
  if (url.includes("kqqqhasawqodikpzjemy")) throw new Error("Refusing to run against production.");
  return url.replace(/\/$/, "");
}

function requireTestDatabase(values) {
  const directUrl = values.DRY_RUN_DIRECT_URL;
  if (!directUrl) throw new Error("Missing DRY_RUN_DIRECT_URL for the isolated test project.");
  let parsed;
  try { parsed = new URL(directUrl); } catch { throw new Error("DRY_RUN_DIRECT_URL is not a valid database URL."); }
  const direct = parsed.hostname === `db.${TEST_PROJECT_REF}.supabase.co` && decodeURIComponent(parsed.username) === "postgres";
  const pooler = /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(parsed.hostname) && decodeURIComponent(parsed.username) === `postgres.${TEST_PROJECT_REF}`;
  if (!["postgresql:", "postgres:"].includes(parsed.protocol) || (!direct && !pooler) || parsed.pathname !== "/postgres") {
    throw new Error(`Refusing to run: database must belong exactly to test project ${TEST_PROJECT_REF}.`);
  }
  return directUrl;
}

module.exports = { TEST_PROJECT_REF, loadDryRunEnvironment, requireTestProject, requireTestDatabase };
