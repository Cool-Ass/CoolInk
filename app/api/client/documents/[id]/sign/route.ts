import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { withClientMediaWrite } from "@/lib/clientMediaWrite";
import { parseDocumentFields, validateDocumentAnswers } from "@/lib/documentForms";
import { signatureDigest, validateSignature, type SignedSnapshot } from "@/lib/sessionSignature";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  const limit = await rateLimit(request, "session-signature", 30, 3600000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  let body, signature: string;
  try {
    const raw = await request.text();
    if (raw.length > 120000) throw Error("Formularz jest zbyt duży.");
    body = JSON.parse(raw);
    if (body.acknowledged !== true || typeof body.appointmentId !== "string" || body.appointmentId.length > 100) throw Error("Potwierdź treść dokumentu i wybierz sesję.");
    signature = JSON.stringify(validateSignature(body.signature));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Sprawdź formularz." }, { status: 400 }); }
  try {
    const result = await withClientMediaWrite(client.id, async tx => {
      const visit = await tx.appointment.findFirst({ where: { id: body.appointmentId, status: { notIn: ["cancelled", "no_show"] }, project: { clientId: client.id } }, include: { project: { select: { title: true } } } });
      const document = await tx.studioDocument.findFirst({ where: { id, published: true, category: "consent" } });
      if (!visit || !document) return { status: 404, error: "Dokument lub sesja nie są dostępne." };
      if (body.version !== document.version) return { status: 409, error: "Dokument zmienił się. Odśwież stronę i przeczytaj nową wersję." };
      let answers;
      const fields = parseDocumentFields(document.formFields);
      try { answers = validateDocumentAnswers(fields, body.answers ?? {}); }
      catch (error) { return { status: 400, error: error instanceof Error ? error.message : "Sprawdź odpowiedzi." }; }
      const acceptance = await tx.documentAcceptance.upsert({ where: { clientId_documentId_version: { clientId: client.id, documentId: id, version: document.version } }, create: { clientId: client.id, documentId: id, version: document.version, answers: JSON.stringify(answers) }, update: {} });
      const existing = await tx.sessionDocumentSignature.findUnique({ where: { acceptanceId_appointmentId: { acceptanceId: acceptance.id, appointmentId: visit.id } } });
      if (existing) return { status: 200, id: existing.id };
      const snapshot: SignedSnapshot = { documentId: id, title: document.title, version: document.version, content: document.content, answers, fieldLabels: Object.fromEntries(fields.map(field => [field.id, field.label])), clientName: client.firstName + " " + client.lastName, appointmentId: visit.id, startsAt: visit.startsAt.toISOString(), projectTitle: visit.project.title };
      const serialized = JSON.stringify(snapshot), acceptedAt = new Date();
      const saved = await tx.sessionDocumentSignature.create({ data: { clientId: client.id, acceptanceId: acceptance.id, appointmentId: visit.id, signature, snapshot: serialized, acceptedAt, digest: signatureDigest(serialized, signature, acceptedAt) } });
      return { status: 201, id: saved.id };
    });
    return NextResponse.json(result.error ? { error: result.error } : { accepted: true, signatureId: result.id }, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Nie udało się zapisać podpisu. Spróbuj ponownie." }, { status: 503 }); }
}
