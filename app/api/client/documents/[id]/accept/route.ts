import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się, aby potwierdzić dokument." }, { status: 401 });
  const { id } = await params;
  const document = await prisma.studioDocument.findFirst({ where: { id, published: true } });
  if (!document) return NextResponse.json({ error: "Ten dokument nie jest dostępny." }, { status: 404 });
  await prisma.documentAcceptance.upsert({
    where: { clientId_documentId_version: { clientId: client.id, documentId: document.id, version: document.version } },
    create: { clientId: client.id, documentId: document.id, version: document.version }, update: {},
  });
  return NextResponse.json({ accepted: true });
}
