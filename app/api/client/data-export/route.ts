import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooManyRequests } from "@/lib/requestSecurity";

export async function GET(request: Request) {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const limit = await rateLimit(request, "client-data-export", 3, 24 * 60 * 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const data = await prisma.client.findUnique({
    where: { id: client.id },
    include: {
      projects: { include: { appointments: true, activities: true, messages: { select: { id: true, author: true, body: true, readAt: true, createdAt: true, attachmentId: true } }, images: { select: { id: true, caption: true, order: true, createdAt: true } }, waitlistEntry: true } },
      acceptances: { include: { document: { select: { id: true, title: true, category: true, version: true } } } },
      notifications: true,
      directMessages: true,
      deletionRequest: true,
    },
  });
  if (!data) return NextResponse.json({ error: "Profil nie istnieje." }, { status: 404 });
  const acceptedDocumentVersions = data.acceptances.length
    ? await prisma.studioDocumentVersion.findMany({
        where: { OR: data.acceptances.map((acceptance) => ({ documentId: acceptance.documentId, version: acceptance.version })) },
        select: { documentId: true, version: true, title: true, content: true, category: true, createdAt: true },
      })
    : [];
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), controller: "CoolInk Tattoo Studio", data: { ...data, acceptedDocumentVersions } }, null, 2);
  return new NextResponse(payload, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="coolink-dane-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" } });
}
