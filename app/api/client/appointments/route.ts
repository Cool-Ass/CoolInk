import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { bookingConflict, validAppointmentRange } from "@/lib/bookingRules";
import { activityMessage } from "@/lib/projectWorkflow";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = rateLimit(request, "appointment-request", 20, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się, aby zaproponować termin." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const projectId = String(body?.projectId ?? "");
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  if (!projectId || !validAppointmentRange(startsAt, endsAt)) return NextResponse.json({ error: "Wybierz termin rozpoczynający się o pełnej lub wpół do, o długości od 30 minut do 12 godzin." }, { status: 400 });
  const project = await prisma.tattooProject.findFirst({ where: { id: projectId, clientId: client.id } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono Twojego projektu." }, { status: 404 });
  // Working hours are a studio-side planning aid, not public availability.
  // A client may request only an exact range explicitly published as free.
  const [conflict, publishedSlot] = await Promise.all([
    bookingConflict(startsAt, endsAt),
    prisma.availableSlot.findFirst({
      where: {
        isPublic: true,
        startsAt: { lte: startsAt },
        endsAt: { gte: endsAt },
      },
      select: { id: true },
    }),
  ]);
  if (!publishedSlot) return NextResponse.json({ error: "Ten dzień nie został udostępniony jako wolny termin." }, { status: 409 });
  if (conflict.appointment || conflict.block) return NextResponse.json({ error: `Ten termin nie jest już dostępny. Uwzględniam też ${conflict.bufferMinutes}-minutowy bufor między wizytami.` }, { status: 409 });
  const appointment = await prisma.appointment.create({ data: { projectId, startsAt, endsAt, status: "requested" } });
  await prisma.$transaction([
    prisma.tattooProject.update({ where: { id: projectId }, data: { status: "awaiting_confirmation" } }),
    prisma.projectActivity.create({ data: { projectId, type: "appointment_requested", message: activityMessage("appointment_requested", startsAt.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })), visibility: "admin" } }),
  ]);
  return NextResponse.json({ appointment }, { status: 201 });
}
