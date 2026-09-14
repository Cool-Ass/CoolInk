const { PrismaClient, Prisma } = require("@prisma/client");
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
    SELECT p.proname AS name, p.prokind::text AS kind, CASE WHEN p.prosecdef THEN 'definer' ELSE 'invoker' END AS security
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
  for (const routine of routines) if (routine.security === "definer") problems.push(`${routine.name}: SECURITY DEFINER wymaga ręcznego przeglądu`);
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
  console.log(`PASS: ${expectedTables.length} tabel ma RLS i nie udostępnia CRUD rolom anon/authenticated; prywatny bucket inspiracji ma ochronę właściciela; brak funkcji SECURITY DEFINER.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
