import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";

import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";


type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!firstName || !lastName || !email.includes("@")) return NextResponse.json({ error: "Uzupełnij imię, nazwisko i e-mail." }, { status: 400 });
  try {
    const client = await prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({ where: { id }, data: { firstName, lastName, email, phone: String(body?.phone ?? "").trim() || null, tags: String(body?.tags ?? "").trim() } });
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "client.update", targetType: "Client", targetId: id, summary: `Zaktualizowano dane klienta ${firstName} ${lastName}.` } });
      return updated;
    });
    return NextResponse.json({ client });
  } catch { return NextResponse.json({ error: "Nie udało się zapisać danych klienta." }, { status: 409 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const access = await requireAdminApi("clients.delete");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const exists = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Nie znaleziono danych." }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.accountDeletionRequest.upsert({ where: { clientId: id }, update: {}, create: { clientId: id, note: "Wniosek administratora. Wymaga weryfikacji retencji i kontrolowanej anonimizacji; dane nie zostały usunięte." } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "client.deletion_requested", targetType: "Client", targetId: id, summary: "Zarejestrowano wniosek usunięcia danych bez kasowania historii." } });
  });
  return NextResponse.json({ ok: true, requested: true }, { status: 202 });
}
