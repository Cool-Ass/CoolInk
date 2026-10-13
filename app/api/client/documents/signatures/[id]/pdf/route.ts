import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { signedDocumentPdf } from "@/lib/signedDocumentPdf";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getCurrentClient();
  if (!client) return Response.json({ error: "Zaloguj się." }, { status: 401 });
  const record = await prisma.sessionDocumentSignature.findFirst({ where: { id: (await params).id, clientId: client.id } });
  if (!record) return Response.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
  try { return new Response(Buffer.from(await signedDocumentPdf(record)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="zgoda.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" } }); }
  catch { return Response.json({ error: "Archiwum chwilowo niedostępne." }, { status: 503 }); }
}
