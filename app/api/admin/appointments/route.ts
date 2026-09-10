import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingConflict, lockBookingCalendar, validAppointmentRange } from "@/lib/bookingRules";
import { activityMessage } from "@/lib/projectWorkflow";
import { formatCoolinkDateTime } from "@/lib/dateTime";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";
import { syncAppointmentToGoogle } from "@/lib/googleCalendarSyncEngine";

class BookingConflictError extends Error {}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const requestedProjectId = String(body?.projectId ?? "");
  const requestedClientId = String(body?.clientId ?? "");
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin co 30 minut, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const rawPrice = body?.price;
  const price = rawPrice === undefined || rawPrice === "" ? null : Number(rawPrice);
  if (price !== null && (!Number.isInteger(price) || price < 0 || price > 1_000_000)) return NextResponse.json({ error: "Cena musi być liczbą całkowitą od 0 do 1 000 000 PLN." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockBookingCalendar(tx);
      const conflict = await bookingConflict(startsAt, endsAt, undefined, !Boolean(body?.ignoreBuffer), tx);
      if (conflict.appointment || conflict.block) throw new BookingConflictError();

      let project = requestedProjectId ? await tx.tattooProject.findUnique({ where: { id: requestedProjectId } }) : null;
      if (requestedProjectId && !project) throw new Error("PROJECT_NOT_FOUND");
      if (!project) {
        let clientId = requestedClientId;
        if (clientId) {
          if (!(await tx.client.findUnique({ where: { id: clientId }, select: { id: true } }))) throw new Error("CLIENT_NOT_FOUND");
        } else {
          const firstName = String(body?.newClient?.firstName ?? "").trim().slice(0, 80);
          const lastName = String(body?.newClient?.lastName ?? "").trim().slice(0, 80);
          const email = String(body?.newClient?.email ?? "").trim().toLowerCase().slice(0, 254);
          if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_CLIENT");
          clientId = (await tx.client.create({ data: { firstName, lastName, email, phone: String(body?.newClient?.phone ?? "").trim().slice(0, 40) || null } })).id;
        }
        project = await tx.tattooProject.create({ data: { clientId, title: String(body?.projectTitle ?? "").trim().slice(0, 160) || "Wizyta umówiona ręcznie", description: String(body?.projectDescription ?? "").trim().slice(0, 5_000) || "Wizyta dodana z kalendarza admina.", status: "confirmed", nextAction: "Przygotuj projekt lub szczegóły najbliższej sesji" } });
      }

      const appointment = await tx.appointment.create({ data: { projectId: project.id, startsAt, endsAt, status: "confirmed", notes: String(body?.notes ?? "").trim().slice(0, 5_000) || null, price } });
      await tx.tattooProject.update({ where: { id: project.id }, data: { status: "confirmed" } });
      await tx.projectActivity.create({ data: { projectId: project.id, type: "appointment_confirmed", message: activityMessage("appointment_confirmed", formatCoolinkDateTime(startsAt)), visibility: "client" } });
      await tx.clientNotification.create({ data: { clientId: project.clientId, projectId: project.id, appointmentId: appointment.id, type: "APPOINTMENT_CONFIRMED", title: "Wizyta potwierdzona", body: `Termin: ${formatCoolinkDateTime(startsAt)}.`, href: "/app/portal/visits" } });
      return appointment;
    });
    await syncAppointmentToGoogle(result.id).catch(() => undefined);
    return NextResponse.json({ appointment: result }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingConflictError) return NextResponse.json({ error: "Ten termin jest niedostępny. Wybierz inny zakres." }, { status: 409 });
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") return NextResponse.json({ error: "Nie znaleziono klienta." }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_CLIENT") return NextResponse.json({ error: "Dla nowego klienta podaj imię, nazwisko i poprawny e-mail." }, { status: 400 });
    return NextResponse.json({ error: "Nie udało się zaplanować wizyty. Sprawdź, czy e-mail nie jest już używany." }, { status: 409 });
  }
}
