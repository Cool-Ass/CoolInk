import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;
  const { id } = await params;
  const [responses, revisions] = await Promise.all([
    prisma.documentAcceptance.findMany({ where: { documentId: id }, include: { client: { select: { firstName: true, lastName: true } } }, orderBy: { acceptedAt: "desc" }, take: 200 }),
    prisma.studioDocumentVersion.findMany({ where: { documentId: id }, select: { version: true, formFields: true } }),
  ]);
  return NextResponse.json({ responses: responses.map((response) => ({ id: response.id, client: `${response.client.firstName} ${response.client.lastName}`, version: response.version, acceptedAt: response.acceptedAt.toISOString(), answers: JSON.parse(response.answers), fields: JSON.parse(revisions.find((revision) => revision.version === response.version)?.formFields ?? "[]") })) }, { headers: { "Cache-Control": "private, no-store" } });
}
