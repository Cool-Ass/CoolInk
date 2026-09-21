import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";
import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { deletePrivateProjectMedia } from "@/lib/privateMedia";

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
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        firstName: true,
        lastName: true,
        supabaseUserId: true,
        directMessages: { select: { imageUrl: true } },
        projects: {
          select: {
            appointments: { select: { id: true } },
            images: { select: { url: true } },
          },
        },
      },
    });
    if (!client) return NextResponse.json({ error: "Klient nie istnieje." }, { status: 404 });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (client.supabaseUserId && (!supabaseUrl || !serviceKey)) return NextResponse.json({ error: "Automatyczne usuwanie konta wymaga klucza SUPABASE_SERVICE_ROLE_KEY. Konto nie zostało zmienione." }, { status: 503 });

    const appointmentIds = client.projects.flatMap((project) => project.appointments.map((appointment) => appointment.id));
    if (appointmentIds.length) {
      await prisma.appointment.updateMany({ where: { id: { in: appointmentIds } }, data: { status: "cancelled" } });
      await Promise.all(appointmentIds.map((appointmentId) => syncAppointmentToGoogle(appointmentId).catch(() => undefined)));
    }

    const media = await deletePrivateProjectMedia([...client.projects.flatMap((project) => project.images.map((image) => image.url)), ...client.directMessages.flatMap((message) => message.imageUrl ? [message.imageUrl] : [])]);
    if (media.failures.length) return NextResponse.json({ error: "Nie udało się bezpiecznie usunąć wszystkich prywatnych plików. Dane klienta nie zostały usunięte." }, { status: 502 });

    if (client.supabaseUserId) {
      const authDeletion = await fetch(`${supabaseUrl!}/auth/v1/admin/users/${encodeURIComponent(client.supabaseUserId)}`, {
        method: "DELETE",
        headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey!}` },
        cache: "no-store",
      });
      if (!authDeletion.ok && authDeletion.status !== 404) return NextResponse.json({ error: "Supabase nie potwierdził usunięcia konta logowania. Dane klienta nie zostały usunięte." }, { status: 502 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "client.delete", targetType: "Client", targetId: id, summary: `Usunięto konto klienta ${client.firstName} ${client.lastName} wraz z powiązanymi danymi.`, metadata: JSON.stringify({ supabaseAuthDeleted: Boolean(client.supabaseUserId) }) } });
      await tx.client.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Nie udało się usunąć konta klienta." }, { status: 409 }); }
}
