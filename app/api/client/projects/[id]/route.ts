import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";
import { deletePrivateProjectMedia } from "@/lib/privateMedia";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 160);
  const description = String(body?.description ?? "").trim().slice(0, 5_000);
  if (!title || description.length < 12) return NextResponse.json({ error: "Podaj tytuł i opis projektu (minimum 12 znaków)." }, { status: 400 });
  const project = await prisma.tattooProject.findFirst({ where: { id, clientId: client.id }, select: { id: true, title: true, description: true } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.tattooProject.update({ where: { id }, data: { title, description, nextAction: "Sprawdź zmiany w opisie projektu", nextActionDueAt: new Date() } });
    await tx.projectActivity.create({ data: { projectId: id, type: "project_details_updated_by_client", message: "Klient zaktualizował tytuł lub opis projektu.", visibility: "admin" } });
    return result;
  });
  await sendPushToAdmins({ title: "Klient zaktualizował projekt", body: `${client.firstName} ${client.lastName}: ${title}`, url: `/admin/clients/${client.id}?view=projects`, tag: `client-project-update-${id}` }).catch(() => undefined);
  return NextResponse.json({ project: { id: updated.id, title: updated.title, description: updated.description } });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const project = await prisma.tattooProject.findFirst({
    where: { id, clientId: client.id },
    select: { id: true, title: true, appointments: { select: { id: true } }, images: { select: { url: true } } },
  });
  if (!project) return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });

  const appointmentIds = project.appointments.map((appointment) => appointment.id);
  if (appointmentIds.length) {
    await prisma.appointment.updateMany({ where: { id: { in: appointmentIds } }, data: { status: "cancelled" } });
    await Promise.all(appointmentIds.map((appointmentId) => syncAppointmentToGoogle(appointmentId).catch(() => undefined)));
  }

  const media = await deletePrivateProjectMedia(project.images.map((image) => image.url));
  if (media.failures.length) return NextResponse.json({ error: "Nie udało się bezpiecznie usunąć prywatnych plików projektu. Projekt nie został usunięty." }, { status: 502 });
  const deleted = await prisma.tattooProject.deleteMany({ where: { id, clientId: client.id } });
  if (!deleted.count) return NextResponse.json({ error: "Projekt został już usunięty." }, { status: 404 });
  await sendPushToAdmins({
    title: "Klient usunął projekt",
    body: `${client.firstName} ${client.lastName} usunął projekt „${project.title}”.`,
    url: `/admin/clients/${client.id}`,
    tag: `client-project-delete-${id}`,
  }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
