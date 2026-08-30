import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import {
  isSameOrigin,
  rateLimit,
  tooManyRequests,
} from "@/lib/requestSecurity";

const MAX_MESSAGE_LENGTH = 2_000;

async function ownedProject(projectId: string, clientId: string) {
  return prisma.tattooProject.findFirst({
    where: { id: projectId, clientId },
    select: { id: true },
  });
}

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
      ? {
          id: message.attachment.id,
          caption: message.attachment.caption,
          url: `/api/client/images/${message.attachment.id}`,
        }
      : null,
  };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await getCurrentClient();
  const { id } = await params;
  if (!client)
    return NextResponse.json(
      { error: "Zaloguj się ponownie." },
      { status: 401 },
    );
  if (!(await ownedProject(id, client.id)))
    return NextResponse.json(
      { error: "Nie znaleziono projektu." },
      { status: 404 },
    );
  const messages = await prisma.projectMessage.findMany({
    where: { projectId: id },
    include: { attachment: { select: { id: true, caption: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  await prisma.projectMessage.updateMany({
    where: { projectId: id, author: "admin", readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ messages: messages.map(serialize) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await getCurrentClient();
  const { id } = await params;
  if (!client)
    return NextResponse.json(
      { error: "Zaloguj się ponownie." },
      { status: 401 },
    );
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = rateLimit(
    request,
    "client-project-message",
    20,
    60_000,
    client.id,
  );
  if (!limit.allowed) return tooManyRequests(limit);
  if (!(await ownedProject(id, client.id)))
    return NextResponse.json(
      { error: "Nie znaleziono projektu." },
      { status: 404 },
    );
  const body = await request.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH)
    return NextResponse.json(
      { error: `Wiadomość musi mieć od 1 do ${MAX_MESSAGE_LENGTH} znaków.` },
      { status: 400 },
    );
  const message = await prisma.projectMessage.create({
    data: { projectId: id, author: "client", body: text },
    include: { attachment: { select: { id: true, caption: true } } },
  });
  return NextResponse.json({ message: serialize(message) }, { status: 201 });
}
