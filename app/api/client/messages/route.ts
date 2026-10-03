import { messageRecipient, visibleMessages } from "@/lib/messageVisibility";
import { readChatInput, serializeDirectMessage } from "@/lib/chatImage";
import { withClientMediaWrite } from "@/lib/clientMediaWrite";
import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { sendPushToAdmins } from "@/lib/webPush";

const MAX_MESSAGE_LENGTH = 2_000;


export async function GET() {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const opened = await prisma.directMessage.findFirst({ where: { clientId: client.id, author: "admin" }, select: { id: true } });
  if (!opened) return NextResponse.json({ messages: [], canReply: false });
  const messages = await prisma.directMessage.findMany({ where: { clientId: client.id, ...visibleMessages(messageRecipient("client", client.id)) }, orderBy: { createdAt: "asc" }, take: 200 });
  return NextResponse.json({ messages: messages.map((message) => serializeDirectMessage(message, "client", client.id)), canReply: true });
}

export async function PATCH(request: Request) {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await prisma.directMessage.updateMany({ where: { clientId: client.id, author: "admin", readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true, updated: result.count });
}

export async function POST(request: Request) {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = await rateLimit(request, "client-direct-message", 20, 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const opened = await prisma.directMessage.findFirst({ where: { clientId: client.id, author: "admin" }, select: { id: true } });
  if (!opened) return NextResponse.json({ error: "Rozmowę ogólną może rozpocząć studio. Wiadomość dotyczącą projektu wyślij z jego karty." }, { status: 403 });
  let message;
  try { message = await withClientMediaWrite(client.id, async (tx, track) => {
    const { body, imageUrl } = await readChatInput(request, client.id, track);
    if (imageUrl) track(imageUrl);
    if ((!body && !imageUrl) || body.length > MAX_MESSAGE_LENGTH) throw new Error("Nieprawidłowa wiadomość.");
    return tx.directMessage.create({ data: { clientId: client.id, author: "client", body, imageUrl } });
  }); } catch { return NextResponse.json({ error: "Nie udało się zapisać wiadomości. Sprawdź profil i spróbuj ponownie." }, { status: 409 }); }
  const body = message.body;
  await sendPushToAdmins({ title: "Nowa wiadomość od klienta", body: `${client.firstName} ${client.lastName}: ${body.slice(0, 120)}`, url: `/admin/clients/${client.id}?view=messages`, tag: `client-direct-${message.id}` }).catch(() => undefined);
  return NextResponse.json({ message: serializeDirectMessage(message, "client", client.id) }, { status: 201 });
}
