import { CHAT_PAGE_SIZE, chatOrder, chatBefore, chatPage } from "@/lib/chatPagination";
import { parseMessageReceipt } from "@/lib/messageReceipt";
import { hideProjectMessages, messageRecipient, visibleMessages } from "@/lib/messageVisibility";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isSameOrigin,
  rateLimit,
  tooManyRequests,
} from "@/lib/requestSecurity";
import { sendPushToClient } from "@/lib/webPush";
import { privateImageUrl } from "@/lib/privateMedia";

const MAX_MESSAGE_LENGTH = 2_000;

function serialize(message: {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  deliveredAt?: Date | null;
  attachment: { id: string; caption: string | null } | null;
}, adminId: string) {
  return {
    id: message.id,
    author: message.author,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
    deliveredAt: message.deliveredAt?.toISOString() ?? null,
    attachment: message.attachment
      ? { id: message.attachment.id, caption: message.attachment.caption, url: privateImageUrl(message.attachment.id, "admin", adminId) }
      : null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Brak dostępu administratora." },
      { status: 401 },
    );
  const { id } = await params;
  const project = await prisma.tattooProject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!project)
    return NextResponse.json(
      { error: "Projekt nie istnieje." },
      { status: 404 },
    );
  let before;
  try { before = chatBefore(request); } catch { return NextResponse.json({ error: "Nieprawidłowy zakres historii." }, { status: 400 }); }
  const messages = await prisma.projectMessage.findMany({
    where: { AND: [before], projectId: id, ...visibleMessages(messageRecipient("admin", admin.id)) },
    include: { attachment: { select: { id: true, caption: true } } },
    orderBy: chatOrder,
    take: CHAT_PAGE_SIZE + 1,
  });
  return NextResponse.json({ hasMore: messages.length > CHAT_PAGE_SIZE, messages: chatPage(messages).messages.map((message) => serialize(message, admin.id)) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentAdmin()))
    return NextResponse.json(
      { error: "Brak dostępu administratora." },
      { status: 401 },
    );
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const project = await prisma.tattooProject.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!project)
    return NextResponse.json(
      { error: "Projekt nie istnieje." },
      { status: 404 },
    );
  let receipt;
  try { receipt = await parseMessageReceipt(request); } catch { return NextResponse.json({ error: "Nieprawidłowe potwierdzenie." }, { status: 400 }); }
  const now = new Date();
  const scope = { ...{ projectId: id, author: "client" }, ...(receipt.ids ? { id: { in: receipt.ids } } : {}) };
  const result = await prisma.$transaction(async tx => {
    const delivered = await tx.projectMessage.updateMany({ where: { ...scope, deliveredAt: null }, data: { deliveredAt: now } });
    if (receipt.state === "read") return tx.projectMessage.updateMany({ where: { ...scope, readAt: null }, data: { readAt: now } });
    return delivered;
  });
  return NextResponse.json({ ok: true, updated: result.count });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  const { id } = await params;
  if (!admin)
    return NextResponse.json(
      { error: "Brak dostępu administratora." },
      { status: 401 },
    );
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = await rateLimit(
    request,
    "admin-project-message",
    40,
    60_000,
    admin.id,
  );
  if (!limit.allowed) return tooManyRequests(limit);
  const project = await prisma.tattooProject.findUnique({
    where: { id },
    select: { id: true, clientId: true },
  });
  if (!project)
    return NextResponse.json(
      { error: "Projekt nie istnieje." },
      { status: 404 },
    );
  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH)
    return NextResponse.json(
      { error: `Wiadomość musi mieć od 1 do ${MAX_MESSAGE_LENGTH} znaków.` },
      { status: 400 },
    );
  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.projectMessage.create({ data: { projectId: id, author: "admin", body: text }, include: { attachment: { select: { id: true, caption: true } } } });
    const followUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1_000);
    await tx.tattooProject.update({ where: { id }, data: { nextAction: "Oczekiwanie na odpowiedź klienta", nextActionDueAt: followUp } });
    await tx.clientNotification.create({ data: { clientId: project.clientId, projectId: id, type: "NEW_STUDIO_MESSAGE", title: "Nowa wiadomość od studia", body: text.slice(0, 240), href: "/app/portal/messages" } });
    return message;
  });
  await sendPushToClient(project.clientId, { title: "Nowa wiadomość od CoolInk", body: text.slice(0, 160), url: "/app/portal/messages", tag: `studio-message-${result.id}` }).catch(() => undefined);
  return NextResponse.json({ message: serialize(result, admin.id) }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const project = await prisma.tattooProject.findUnique({ where: { id }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const url = new URL(request.url);
  const removeAll = url.searchParams.get("all") === "true";
  const messageId = url.searchParams.get("messageId");
  if (!removeAll && !messageId) return NextResponse.json({ error: "Wybierz wiadomość lub całą rozmowę." }, { status: 400 });
  const result = await hideProjectMessages(removeAll ? { projectId: id } : { id: messageId!, projectId: id }, messageRecipient("admin", admin.id));

  return NextResponse.json({ ok: true, removed: result.count });
}
