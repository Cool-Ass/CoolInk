import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";
import { lockBookingCalendar } from "@/lib/bookingRules";


type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (body?.archived === false) {
    const restored = await prisma.tattooProject.updateMany({ where: { id, clientId: client.id }, data: { clientArchivedAt: null } });
    return restored.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  }
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
  const result = await prisma.$transaction(async (tx) => {
    await lockBookingCalendar(tx);
    const project = await tx.tattooProject.findFirst({ where: { id, clientId: client.id }, select: { clientArchivedAt: true, appointments: { select: { status: true } } } });
    if (!project) return "missing";
    if (project.appointments.some((visit) => !["completed", "cancelled", "no_show"].includes(visit.status))) return "active";
    if (!project.clientArchivedAt) {
      await tx.tattooProject.update({ where: { id }, data: { clientArchivedAt: new Date() } });
      await tx.projectActivity.create({ data: { projectId: id, type: "client_archived", message: "Klient przeniósł projekt do archiwum. Historia pozostaje zachowana.", visibility: "both" } });
    }
    return "archived";
  });
  if (result === "missing") return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  if (result === "active") return NextResponse.json({ error: "Projekt ma aktywne wizyty. Najpierw anuluj projekt lub poczekaj na zakończenie wizyt." }, { status: 409 });
  return NextResponse.json({ ok: true, archived: true });
}
