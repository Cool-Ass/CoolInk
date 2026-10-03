const { PrismaClient, Prisma } = require("@prisma/client");
const { readFileSync } = require("node:fs");
const { loadDryRunEnvironment, requireTestProject, requireTestDatabase } = require("./dryRunTestEnv.cjs");
const dryRun = loadDryRunEnvironment();
requireTestProject(dryRun);
process.env.DATABASE_URL = requireTestDatabase(dryRun);
const prisma = new PrismaClient();

async function main() {
  const relations = await prisma.$queryRawUnsafe(`
    SELECT c.relname AS "table", c.relkind::text AS kind,
      c.relrowsecurity AS rls, c.relforcerowsecurity AS "forceRls",
      COALESCE(string_agg(DISTINCT g.privilege_type::text, ',') FILTER (WHERE g.grantee = 'anon'), '') AS anon,
      COALESCE(string_agg(DISTINCT g.privilege_type::text, ',') FILTER (WHERE g.grantee = 'authenticated'), '') AS authenticated,
      COALESCE(string_agg(DISTINCT (p.policyname || ':' || p.cmd)::text, ',') FILTER (WHERE p.policyname IS NOT NULL), '') AS policies
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN information_schema.role_table_grants g ON g.table_schema = n.nspname AND g.table_name = c.relname
    LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'S')
    GROUP BY c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
    ORDER BY c.relkind, c.relname;
  `);
  const routines = await prisma.$queryRawUnsafe(`
    SELECT p.proname AS name, p.prokind::text AS kind, CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END AS security,
      p.pronargs AS args, p.prorettype::regtype::text AS result, p.prosrc AS source, p.proconfig AS config,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS "anonExec",
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS "authenticatedExec",
      EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE') AS "publicExec"
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' ORDER BY p.proname;
  `);
  const storageBuckets = await prisma.$queryRawUnsafe(`
    SELECT id, public, file_size_limit AS "fileSizeLimit", allowed_mime_types AS "allowedMimeTypes"
    FROM storage.buckets WHERE id = 'project-inspirations';
  `);
  const storagePolicies = await prisma.$queryRawUnsafe(`
    SELECT policyname, permissive, cmd, roles
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'coolink_project_inspiration_%';
  `);
  const byName = new Map(relations.map((relation) => [relation.table, relation]));
  const expectedTables = Prisma.dmmf.datamodel.models.map((model) => model.dbName || model.name);
  const problems = [];
  for (const table of expectedTables) {
    const relation = byName.get(table);
    if (!relation) problems.push(`${table}: brak tabeli`);
    else {
      if (!relation.rls) problems.push(`${table}: RLS wyłączone`);
      if (relation.anon) problems.push(`${table}: uprawnienia anon=${relation.anon}`);
      if (relation.authenticated) problems.push(`${table}: uprawnienia authenticated=${relation.authenticated}`);
    }
  }
  // One individually reviewed boolean Storage guard. No arguments, personal
  // data, dynamic SQL or public/anon execute; pin the actual function body to
  // the reviewed migration. Every other definer remains a failing audit.
  const guardMigration = readFileSync("prisma/migrations/20261003081000_privacy_guard_correction/migration.sql", "utf8");
  const guardBody = guardMigration.match(/CREATE OR REPLACE FUNCTION public\.coolink_storage_identity_active\(\)[\s\S]*?AS \$\$([\s\S]*?)\$\$/)?.[1];
  const normalized = text => String(text).replace(/\s+/g, " ").trim();
  let reviewedGuard = false;
  for (const routine of routines) if (routine.security === "definer") {
    const approved = routine.name === "coolink_storage_identity_active" && routine.args === 0 && routine.result === "boolean"
      && guardBody && normalized(routine.source) === normalized(guardBody)
      && JSON.stringify(routine.config) === JSON.stringify(["search_path=public, pg_temp"])
      && !routine.anonExec && !routine.publicExec && routine.authenticatedExec;
    if (!approved) problems.push(`${routine.name}: SECURITY DEFINER wymaga ręcznego przeglądu`);
    else reviewedGuard = true;
  }
  if (!reviewedGuard) problems.push("coolink_storage_identity_active: brak zatwierdzonej ochrony kwarantanny");
  const inspirationBucket = storageBuckets[0];
  if (!inspirationBucket) problems.push("project-inspirations: brak prywatnego bucketu");
  else {
    if (inspirationBucket.public) problems.push("project-inspirations: bucket jest publiczny");
    if (Number(inspirationBucket.fileSizeLimit) > 20 * 1024 * 1024) problems.push("project-inspirations: zbyt wysoki limit pliku");
  }
  const policyNames = new Set(storagePolicies.map((policy) => policy.policyname));
  for (const name of ["coolink_project_inspiration_owner_guard", "coolink_project_inspiration_anon_guard", "coolink_project_inspiration_owner_select", "coolink_project_inspiration_owner_insert"]) {
    if (!policyNames.has(name)) problems.push(`storage.objects: brak polityki ${name}`);
  }
  for (const policy of storagePolicies.filter((item) => item.policyname.endsWith("_guard"))) {
    if (policy.permissive !== "RESTRICTIVE") problems.push(`${policy.policyname}: polityka ochronna nie jest RESTRICTIVE`);
  }
  if (problems.length) throw new Error(`Nieprawidłowa konfiguracja bazy:\n${problems.join("\n")}`);
  console.log(`PASS: ${expectedTables.length} tabel ma RLS bez CRUD anon/authenticated; prywatny Storage ma ochronę właściciela i kwarantanny; tylko jedna indywidualnie sprawdzona funkcja boolean SECURITY DEFINER, exact source/search_path/grants.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
