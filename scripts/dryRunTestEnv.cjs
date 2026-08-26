const fs = require("fs");
const path = require("path");

const TEST_PROJECT_REF = "elwdamixzdqmjcgqaiyq";

function loadDryRunEnvironment() {
  const file = path.join(process.cwd(), ".env.dryrun.local");
  if (!fs.existsSync(file)) throw new Error("Missing .env.dryrun.local. Refusing to guess a database project.");
  const values = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(DRY_RUN_[A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return values;
}

function requireTestProject(values) {
  const url = values.DRY_RUN_SUPABASE_URL;
  if (!url || !url.startsWith(`https://${TEST_PROJECT_REF}.supabase.co`)) {
    throw new Error(`Refusing to run: DRY_RUN_SUPABASE_URL must point exactly to test project ${TEST_PROJECT_REF}.`);
  }
  if (url.includes("kqqqhasawqodikpzjemy")) throw new Error("Refusing to run against production.");
  return url.replace(/\/$/, "");
}

module.exports = { TEST_PROJECT_REF, loadDryRunEnvironment, requireTestProject };
