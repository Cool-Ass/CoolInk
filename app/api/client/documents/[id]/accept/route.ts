import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { parseDocumentFields, validateDocumentAnswers } from "@/lib/documentForms";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się, aby potwierdzić dokument." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const document = await prisma.studioDocument.findFirst({ where: { id, published: true } });
  if (!document) return NextResponse.json({ error: "Ten dokument nie jest dostępny." }, { status: 404 });
  if (body?.version !== document.version) return NextResponse.json({ error: "Dokument został zmieniony. Odśwież stronę i przeczytaj aktualną wersję." }, { status: 409 });
  let answers: string;
  try { answers = JSON.stringify(validateDocumentAnswers(parseDocumentFields(document.formFields), body?.answers ?? {})); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sprawdź odpowiedzi." }, { status: 400 }); }
  await prisma.documentAcceptance.upsert({
    where: { clientId_documentId_version: { clientId: client.id, documentId: document.id, version: document.version } },
    create: { clientId: client.id, documentId: document.id, version: document.version, answers }, update: {},
  });
  return NextResponse.json({ accepted: true });
}
