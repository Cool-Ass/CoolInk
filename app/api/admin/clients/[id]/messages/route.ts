import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { sendPushToClient } from "@/lib/webPush";

const MAX_MESSAGE_LENGTH = 2_000;

function serialize(message: { id: string; author: string; body: string; createdAt: Date; readAt: Date | null }) {
  return { ...message, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: null };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  const { id } = await params;
  if (!(await prisma.client.findUnique({ where: { id }, select: { id: true } }))) return NextResponse.json({ error: "Klient nie istnieje." }, { status: 404 });
  await prisma.directMessage.updateMany({ where: { clientId: id, author: "client", readAt: null }, data: { readAt: new Date() } });
  const messages = await prisma.directMessage.findMany({ where: { clientId: id }, orderBy: { createdAt: "asc" }, take: 200 });
  return NextResponse.json({ messages: messages.map(serialize) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const limit = await rateLimit(request, "admin-direct-message", 40, 60_000, admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Klient nie istnieje." }, { status: 404 });
  const input = await request.json().catch(() => null);
  const body = String(input?.body ?? "").trim();
  if (!body || body.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: `Wiadomość musi mieć od 1 do ${MAX_MESSAGE_LENGTH} znaków.` }, { status: 400 });
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.directMessage.create({ data: { clientId: id, author: "admin", body } });
    await tx.clientNotification.create({ data: { clientId: id, type: "NEW_STUDIO_MESSAGE", title: "Nowa wiadomość od studia", body: body.slice(0, 240), href: "/app/portal/messages#studio" } });
    return created;
  });
  await sendPushToClient(id, { title: "Nowa wiadomość od CoolInk", body: body.slice(0, 160), url: "/app/portal/messages#studio", tag: `studio-direct-${message.id}` }).catch(() => undefined);
  return NextResponse.json({ message: serialize(message) }, { status: 201 });
}
