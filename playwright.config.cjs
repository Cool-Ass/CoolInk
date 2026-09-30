const { defineConfig, devices } = require("@playwright/test");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("./scripts/dryRunTestEnv.cjs");
const isolated = loadDryRunEnvironment();
requireTestProject(isolated);
requireTestDatabase(isolated);
const baseURL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3120";
if (baseURL !== "http://127.0.0.1:3120") throw new Error("Browser fixtures may only target the isolated local CI server.");
module.exports = defineConfig({
  testDir: "./e2e", workers: 1, retries: 0, forbidOnly: Boolean(process.env.CI),
  timeout: 120_000, expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  // Network traces can contain session cookies and passwords. Never persist them.
  use: { baseURL, trace: "off", video: "off", screenshot: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", grepInvert: /admin login/, use: { ...devices["Pixel 7"] } },
  ],
});
