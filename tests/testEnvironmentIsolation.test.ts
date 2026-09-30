import { createRequire } from "node:module";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { requireTestProject, requireTestDatabase, TEST_PROJECT_REF: ref } = require("../scripts/dryRunTestEnv.cjs");
it("accepts only the exact isolated Supabase origin", () => {
  expect(requireTestProject({ DRY_RUN_SUPABASE_URL: `https://${ref}.supabase.co/` })).toBe(`https://${ref}.supabase.co`);
  for (const url of [`https://${ref}.supabase.co.evil.test`, `https://${ref}.supabase.co/path`, `https://${ref}.supabase.co?x=1`, `https://user@${ref}.supabase.co`, "https://kqqqhasawqodikpzjemy.supabase.co"]) expect(() => requireTestProject({ DRY_RUN_SUPABASE_URL: url })).toThrow();
});
it("requires an exact direct hostname or pooler tenant identity", () => {
  for (const url of [`postgresql://postgres:pw@db.${ref}.supabase.co:5432/postgres`, `postgresql://postgres.${ref}:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require`]) expect(requireTestDatabase({ DRY_RUN_DIRECT_URL: url })).toBe(url);
  for (const url of [`postgresql://postgres:pw@db.${ref}.supabase.co.evil.test/postgres`, `postgresql://postgres.${ref}-other:pw@aws-0-eu-west-1.pooler.supabase.com/postgres`, `postgresql://${ref}:pw@db.kqqqhasawqodikpzjemy.supabase.co/postgres`, `https://postgres:pw@db.${ref}.supabase.co/postgres`]) expect(() => requireTestDatabase({ DRY_RUN_DIRECT_URL: url })).toThrow();
});
