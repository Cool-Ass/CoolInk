import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const limit = await rateLimit(request, "client-attendance-confirmation", 10, 60 * 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  const appointment = await prisma.appointment.findFirst({ where: { id, status: "confirmed", confirmationRequestedAt: { not: null }, project: { clientId: client.id } }, select: { id: true, projectId: true, project: { select: { title: true } } } });
  if (!appointment) return NextResponse.json({ error: "Ta wizyta nie oczekuje na potwierdzenie obecności." }, { status: 409 });
  const confirmedAt = new Date();
  await prisma.$transaction([
    prisma.appointment.update({ where: { id }, data: { clientConfirmedAt: confirmedAt } }),
    prisma.projectActivity.create({ data: { projectId: appointment.projectId, type: "attendance_confirmed", message: "Klient potwierdził obecność na nadchodzącej wizycie.", visibility: "admin" } }),
  ]);
  await sendPushToAdmins({ title: "Klient potwierdził obecność", body: `${client.firstName} ${client.lastName} · ${appointment.project.title}`, url: `/admin/clients/${client.id}`, tag: `attendance-confirmed-${id}` }).catch(() => undefined);
  return NextResponse.json({ confirmedAt: confirmedAt.toISOString() });
}
