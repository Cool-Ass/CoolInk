import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";

const MAX_MESSAGE_LENGTH = 2_000;

function serialize(message: { id: string; author: string; body: string; createdAt: Date; readAt: Date | null }) {
  return { ...message, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: null };
}

export async function GET() {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const opened = await prisma.directMessage.findFirst({ where: { clientId: client.id, author: "admin" }, select: { id: true } });
  if (!opened) return NextResponse.json({ messages: [], canReply: false });
  await prisma.directMessage.updateMany({ where: { clientId: client.id, author: "admin", readAt: null }, data: { readAt: new Date() } });
  const messages = await prisma.directMessage.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "asc" }, take: 200 });
  return NextResponse.json({ messages: messages.map(serialize), canReply: true });
}

export async function POST(request: Request) {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = await rateLimit(request, "client-direct-message", 20, 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const opened = await prisma.directMessage.findFirst({ where: { clientId: client.id, author: "admin" }, select: { id: true } });
  if (!opened) return NextResponse.json({ error: "Rozmowę ogólną może rozpocząć studio. Wiadomość dotyczącą projektu wyślij z jego karty." }, { status: 403 });
  const input = await request.json().catch(() => null);
  const body = String(input?.body ?? "").trim();
  if (!body || body.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: `Wiadomość musi mieć od 1 do ${MAX_MESSAGE_LENGTH} znaków.` }, { status: 400 });
  const message = await prisma.directMessage.create({ data: { clientId: client.id, author: "client", body } });
  await sendPushToAdmins({ title: "Nowa wiadomość od klienta", body: `${client.firstName} ${client.lastName}: ${body.slice(0, 120)}`, url: `/admin/clients/${client.id}?view=messages`, tag: `client-direct-${message.id}` }).catch(() => undefined);
  return NextResponse.json({ message: serialize(message) }, { status: 201 });
}
