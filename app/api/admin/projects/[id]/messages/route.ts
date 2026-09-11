import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isSameOrigin,
  rateLimit,
  tooManyRequests,
} from "@/lib/requestSecurity";
import { sendPushToClient } from "@/lib/webPush";

const MAX_MESSAGE_LENGTH = 2_000;

function serialize(message: {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  attachment: { id: string; caption: string | null } | null;
}) {
  return {
    id: message.id,
    author: message.author,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
    attachment: message.attachment
      ? { id: message.attachment.id, caption: message.attachment.caption, url: `/api/admin/images/${message.attachment.id}` }
      : null,
  };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentAdmin()))
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
  await prisma.projectMessage.updateMany({ where: { projectId: id, author: "client", readAt: null }, data: { readAt: new Date() } });
  const messages = await prisma.projectMessage.findMany({
    where: { projectId: id },
    include: { attachment: { select: { id: true, caption: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages: messages.map(serialize) });
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
  return NextResponse.json({ message: serialize(result) }, { status: 201 });
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
  const result = await prisma.projectMessage.deleteMany({ where: removeAll ? { projectId: id } : { id: messageId!, projectId: id } });
  if (!removeAll && result.count === 0) return NextResponse.json({ error: "Wiadomość nie istnieje." }, { status: 404 });
  return NextResponse.json({ ok: true, removed: result.count });
}
