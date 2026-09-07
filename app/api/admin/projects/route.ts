import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 5000) : "";
  if (!clientId || !title || !description) return NextResponse.json({ error: "Podaj nazwę i opis projektu." }, { status: 400 });
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Klient nie istnieje." }, { status: 404 });
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.tattooProject.create({ data: { clientId, title, description, status: "inquiry", nextAction: "Przejrzyj projekt i ustal kolejny krok" } });
    await tx.projectActivity.create({ data: { projectId: created.id, type: "project_created", message: "Projekt utworzony przez studio.", visibility: "admin" } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "project.create", targetType: "TattooProject", targetId: created.id, summary: `Utworzono projekt „${title}”.` } });
    return created;
  });
  return NextResponse.json({ project }, { status: 201 });
}
