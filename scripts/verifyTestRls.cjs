/*
 * Repeatable database-level security regression test for the isolated
 * Supabase project. It never uses the production environment. Load test DB
 * variables before running it; see RAPORT-DB-SECURITY-TEST.md.
 */
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();
const privateTables = ["Client", "TattooProject", "Appointment", "ClientNotification", "ProjectActivity"];

function quote(value) { return `"${value.replaceAll('"', '""')}"`; }

async function deniedAs(role, statement, subject) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
      if (subject) await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.sub', '${subject.replaceAll("'", "''")}', true)`);
      await tx.$queryRawUnsafe(statement);
    });
    throw new Error(`${role} unexpectedly executed: ${statement}`);
  } catch (error) {
    if (String(error.message).includes("unexpectedly executed")) throw error;
    if (!/permission denied|row-level security|not authorized/i.test(String(error.message))) throw error;
  }
}

async function main() {
  const tag = `rls-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const aAuth = randomUUID();
  const bAuth = randomUUID();
  const clientA = await prisma.client.create({ data: { firstName: "RLS", lastName: "Client A", email: `${tag}-a@example.test`, supabaseUserId: aAuth } });
  const clientB = await prisma.client.create({ data: { firstName: "RLS", lastName: "Client B", email: `${tag}-b@example.test`, supabaseUserId: bAuth } });
  const projectA = await prisma.tattooProject.create({ data: { clientId: clientA.id, title: "RLS A", description: "test" } });
  const projectB = await prisma.tattooProject.create({ data: { clientId: clientB.id, title: "RLS B", description: "test" } });
  const appointmentB = await prisma.appointment.create({ data: { projectId: projectB.id, startsAt: new Date("2030-01-01T10:00:00.000Z"), endsAt: new Date("2030-01-01T11:00:00.000Z") } });
  const notificationB = await prisma.clientNotification.create({ data: { clientId: clientB.id, type: "TEST", title: "RLS", body: "test" } });
  const activityB = await prisma.projectActivity.create({ data: { projectId: projectB.id, type: "test", message: "RLS test" } });

  try {
    for (const table of privateTables) {
      const q = quote(table);
      for (const role of ["anon", "authenticated"]) {
        await deniedAs(role, `SELECT * FROM public.${q} LIMIT 1`);
        await deniedAs(role, `INSERT INTO public.${q} DEFAULT VALUES`);
        await deniedAs(role, `UPDATE public.${q} SET "id" = "id" WHERE false`);
        await deniedAs(role, `DELETE FROM public.${q} WHERE false`);
      }
    }

    // Client A is denied every direct database operation against client B's
    // records. This is deliberate: the portal uses Next.js endpoints rather
    // than direct PostgREST access, so no broad authenticated policy exists.
    await deniedAs("authenticated", `SELECT * FROM public."TattooProject" WHERE "id" = '${projectB.id}'`, aAuth);
    await deniedAs("authenticated", `UPDATE public."TattooProject" SET "clientId" = '${clientA.id}' WHERE "id" = '${projectB.id}'`, aAuth);
    await deniedAs("authenticated", `SELECT * FROM public."Appointment" WHERE "id" = '${appointmentB.id}'`, aAuth);
    await deniedAs("authenticated", `UPDATE public."Appointment" SET "projectId" = '${projectA.id}' WHERE "id" = '${appointmentB.id}'`, aAuth);
    await deniedAs("authenticated", `SELECT * FROM public."ClientNotification" WHERE "id" = '${notificationB.id}'`, aAuth);
    await deniedAs("authenticated", `SELECT * FROM public."ProjectActivity" WHERE "id" = '${activityB.id}'`, aAuth);

    // Server-side Prisma still has owner access and must keep the full admin
    // workflow available after RLS is enabled.
    const serverRead = await prisma.client.findUnique({ where: { id: clientA.id }, include: { projects: true } });
    if (!serverRead || serverRead.projects[0]?.id !== projectA.id) throw new Error("Prisma owner access is unavailable");
    console.log("PASS: anon/authenticated CRUD blocked; client A cannot access client B; Prisma owner access works.");
  } finally {
    await prisma.client.deleteMany({ where: { id: { in: [clientA.id, clientB.id] } } });
    await prisma.$disconnect();
  }
}

main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exitCode = 1; });
