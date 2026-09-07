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
  try {
    await prisma.$transaction(async (tx) => {
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "client.delete", targetType: "Client", targetId: id, summary: "Usunięto konto klienta wraz z powiązanymi danymi." } });
      await tx.client.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Nie udało się usunąć konta klienta." }, { status: 409 }); }
}
