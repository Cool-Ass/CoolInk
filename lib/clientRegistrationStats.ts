import type { Prisma } from "@prisma/client";

export type ClientRegistrationStats = { total: number; withoutProject: number; withoutAppointment: number };

/** Only aggregate counts leave Auth. Includes accounts not yet linked to CRM. */
export async function getClientRegistrationStats(db: Pick<Prisma.TransactionClient, "$queryRaw">, from: Date, to: Date): Promise<ClientRegistrationStats> {
  const [counts] = await db.$queryRaw<ClientRegistrationStats[]>`
    SELECT count(*)::int AS "total",
      count(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM public."TattooProject" project WHERE project."clientId" = client.id
      ))::int AS "withoutProject",
      count(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM public."Appointment" appointment
        JOIN public."TattooProject" project ON project.id = appointment."projectId"
        WHERE project."clientId" = client.id
      ))::int AS "withoutAppointment"
    FROM auth.users account
    LEFT JOIN public."Client" client ON client."supabaseUserId" = account.id::text
    WHERE account.created_at >= ${from} AND account.created_at <= ${to}
      AND account.email IS NOT NULL AND account.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public."AccountDeletionRequest" request WHERE request."clientId" = client.id
      )
  `;
  return counts ?? { total: 0, withoutProject: 0, withoutAppointment: 0 };
}
