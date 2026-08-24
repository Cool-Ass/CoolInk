import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const requestedProjectId = String(body?.projectId ?? ""); const requestedClientId = String(body?.clientId ?? ""); const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || startsAt.getMinutes() % 30 !== 0 || endsAt.getTime() - startsAt.getTime() !== 30 * 60 * 1000) return NextResponse.json({ error: "Wybierz 30-minutowy termin rozpoczynający się o pełnej lub wpół do." }, { status: 400 });
  let project = requestedProjectId ? await prisma.tattooProject.findUnique({ where: { id: requestedProjectId } }) : null;
  if (!project) {
    let clientId = requestedClientId;
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return NextResponse.json({ error: "Nie znaleziono klienta." }, { status: 404 });
    } else {
      const newClient = body?.newClient;
      const firstName = String(newClient?.firstName ?? "").trim(); const lastName = String(newClient?.lastName ?? "").trim(); const email = String(newClient?.email ?? "").trim().toLowerCase();
      if (!firstName || !lastName || !email) return NextResponse.json({ error: "Dla nowego klienta podaj imię, nazwisko i e-mail." }, { status: 400 });
      try { clientId = (await prisma.client.create({ data: { firstName, lastName, email, phone: String(newClient?.phone ?? "").trim() || null } })).id; } catch { return NextResponse.json({ error: "Nie udało się dodać klienta. Sprawdź, czy e-mail nie jest już używany." }, { status: 409 }); }
    }
    project = await prisma.tattooProject.create({ data: { clientId, title: String(body?.projectTitle ?? "").trim() || "Wizyta umówiona ręcznie", description: "Wizyta dodana z kalendarza admina.", status: "scheduled" } });
  }
  const [collision, blocked] = await Promise.all([prisma.appointment.findFirst({ where: { status: { notIn: ["cancelled", "no_show"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } }), prisma.availabilityBlock.findFirst({ where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } })]);
  if (collision || blocked) return NextResponse.json({ error: "Ten termin jest niedostępny. Wybierz inny zakres." }, { status: 409 });
  const appointment = await prisma.appointment.create({ data: { projectId: project.id, startsAt, endsAt, status: "confirmed", notes: String(body?.notes ?? "").trim() || null } });
  await prisma.tattooProject.update({ where: { id: project.id }, data: { status: "scheduled" } });
  return NextResponse.json({ appointment }, { status: 201 });
}
