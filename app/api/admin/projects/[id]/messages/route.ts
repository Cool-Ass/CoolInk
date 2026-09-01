import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isSameOrigin,
  rateLimit,
  tooManyRequests,
} from "@/lib/requestSecurity";

const MAX_MESSAGE_LENGTH = 2_000;

function serialize(message: {
  id: string;
  author: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  attachment: { id: string; caption: string | null } | null;
}) {
  // Attachment URLs are served through the existing client-authorized endpoint.
  // The admin view still exposes the attachment record and caption without
  // broadening Supabase Storage/Data API access.
  return {
    id: message.id,
    author: message.author,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    readAt: message.readAt?.toISOString() ?? null,
    attachment: message.attachment
      ? { id: message.attachment.id, caption: message.attachment.caption }
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
  const messages = await prisma.projectMessage.findMany({
    where: { projectId: id },
    include: { attachment: { select: { id: true, caption: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  await prisma.projectMessage.updateMany({
    where: { projectId: id, author: "client", readAt: null },
    data: { readAt: new Date() },
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
  const limit = rateLimit(
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
    const message = await tx.projectMessage.create({
      data: { projectId: id, author: "admin", body: text },
      include: { attachment: { select: { id: true, caption: true } } },
    });
    await tx.clientNotification.create({
      data: {
        clientId: project.clientId,
        projectId: id,
        type: "PROJECT_MESSAGE",
        title: "Nowa wiadomość od studia",
        body: text.slice(0, 160),
        href: "/app/portal/messages",
      },
    });
    return message;
  });
  return NextResponse.json({ message: serialize(result) }, { status: 201 });
}
