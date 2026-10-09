import type { Prisma } from "@prisma/client";
import { normalizeLeadSource } from "@/lib/leadSource";

/** First known acquisition source wins; later bookings never overwrite CRM edits. */
export async function captureClientLeadSource(db: Pick<Prisma.TransactionClient, "client">, clientId: string, value: unknown) {
  const leadSource = normalizeLeadSource(value);
  if (!leadSource) return;
  await db.client.updateMany({ where: { id: clientId, leadSource: null }, data: { leadSource } });
}
