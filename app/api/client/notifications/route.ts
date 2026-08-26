import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const notifications = await prisma.clientNotification.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (id === "all") await prisma.clientNotification.updateMany({ where: { clientId: client.id, readAt: null }, data: { readAt: new Date() } });
  else {
    const updated = await prisma.clientNotification.updateMany({ where: { id, clientId: client.id, readAt: null }, data: { readAt: new Date() } });
    if (!updated.count) return NextResponse.json({ error: "Nie znaleziono powiadomienia." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
