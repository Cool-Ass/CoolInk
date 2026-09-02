import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const { id } = await params;
  const project = await prisma.tattooProject.findFirst({ where: { id, clientId: client.id }, select: { id: true, status: true } });
  if (!project) return NextResponse.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  if (project.status === "cancelled") return NextResponse.json({ ok: true });
  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({ where: { projectId: id, status: { in: ["requested", "proposed", "confirmed"] } }, data: { status: "cancelled" } });
    await tx.tattooProject.update({ where: { id }, data: { status: "cancelled" } });
    await tx.projectActivity.create({ data: { projectId: id, type: "project_cancelled_by_client", message: "Klient anulował projekt. Historia i dokumenty pozostają zachowane.", visibility: "admin" } });
  });
  return NextResponse.json({ ok: true });
}
