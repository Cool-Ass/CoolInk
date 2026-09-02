import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingConflict, validAppointmentRange } from "@/lib/bookingRules";
import { activityMessage } from "@/lib/projectWorkflow";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const requestedProjectId = String(body?.projectId ?? ""); const requestedClientId = String(body?.clientId ?? ""); const startsAt = new Date(String(body?.startsAt ?? "")); const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin co 30 minut, o długości od 30 minut do 12 godzin." }, { status: 400 });
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
  const conflict = await bookingConflict(startsAt, endsAt, undefined, !Boolean(body?.ignoreBuffer));
  if (conflict.appointment || conflict.block) return NextResponse.json({ error: "Ten termin jest niedostępny. Wybierz inny zakres." }, { status: 409 });
  const rawPrice = body?.price;
  const price = rawPrice === undefined || rawPrice === "" ? null : Number(rawPrice);
  const validPrice = typeof price === "number" && Number.isInteger(price) && price >= 0 ? price : null;
  const appointment = await prisma.appointment.create({ data: { projectId: project.id, startsAt, endsAt, status: "confirmed", notes: String(body?.notes ?? "").trim() || null, price: validPrice } });
  await prisma.$transaction([
    prisma.tattooProject.update({ where: { id: project.id }, data: { status: "confirmed" } }),
    prisma.projectActivity.create({ data: { projectId: project.id, type: "appointment_confirmed", message: activityMessage("appointment_confirmed", startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })), visibility: "admin" } }),
  ]);
  return NextResponse.json({ appointment }, { status: 201 });
}
