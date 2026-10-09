import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";

import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { normalizeLeadSource } from "@/lib/leadSource";


type Params = { params: Promise<{ id: string }> };
class ClientEditConflict extends Error {}

export async function PATCH(request: Request, { params }: Params) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const leadSource = normalizeLeadSource(body?.leadSource);
  if (body?.leadSource !== undefined && body.leadSource !== "" && body.leadSource !== null && !leadSource) return NextResponse.json({ error: "Wybierz źródło z listy." }, { status: 400 });
  if (!firstName || !lastName || !email.includes("@")) return NextResponse.json({ error: "Uzupełnij imię, nazwisko i e-mail." }, { status: 400 });
  try {
    const client = await prisma.$transaction(async (tx) => {
      const current = await tx.client.findUnique({ where: { id }, select: { email: true, supabaseUserId: true } });
      if (!current) throw new ClientEditConflict("Nie znaleziono klienta.");
      if (current.supabaseUserId && email !== current.email.toLowerCase()) {
        throw new ClientEditConflict("Adres jest powiązany z kontem logowania. Nie można zmienić go tylko w karcie klienta.");
      }
      // Compare-and-swap also protects against linking an account during this edit.
      const changed = await tx.client.updateMany({ where: { id, email: current.email, supabaseUserId: current.supabaseUserId }, data: { firstName, lastName, ...(body?.leadSource !== undefined ? { leadSource } : {}), ...(current.supabaseUserId ? {} : { email }), phone: String(body?.phone ?? "").trim() || null, tags: String(body?.tags ?? "").trim() } });
      if (changed.count !== 1) throw new ClientEditConflict("Dane konta zmieniły się. Odśwież kartę klienta i spróbuj ponownie.");
      const updated = await tx.client.findUniqueOrThrow({ where: { id } });
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "client.update", targetType: "Client", targetId: id, summary: `Zaktualizowano dane klienta ${firstName} ${lastName}.` } });
      return updated;
    });
    return NextResponse.json({ client });
  } catch (error) { return NextResponse.json({ error: error instanceof ClientEditConflict ? error.message : "Nie udało się zapisać danych klienta." }, { status: 409 }); }
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
