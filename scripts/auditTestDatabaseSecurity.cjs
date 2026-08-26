const { PrismaClient } = require("@prisma/client");
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
  console.log(JSON.stringify({ relations, routines }, null, 2));
}
main().finally(() => prisma.$disconnect());
