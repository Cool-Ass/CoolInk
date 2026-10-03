import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { executePrivacyRequest } from "@/lib/privacyExecution";
export const maxDuration = 300;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("clients.delete");
  if (!access.ok) return access.response;
  if (access.admin.role !== "owner") return NextResponse.json({ error: "Tylko właściciel może wykonać ten wniosek." }, { status: 403 });
  const limit = await rateLimit(request, "privacy-execute", 5, 15 * 60_000, access.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const { id } = await params;
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Brak potwierdzenia." }, { status: 400 });
  let body;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { void reader.cancel().catch(() => {}); return NextResponse.json({ error: "Potwierdzenie jest zbyt duże." }, { status: 413 }); }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return NextResponse.json({ error: "Nieprawidłowe potwierdzenie." }, { status: 400 }); }
  finally { reader.releaseLock(); }
  if (body?.confirmation !== `USUŃ ${id}` || typeof body.expectedRevision !== "string" || !/^[a-f0-9]{64}$/.test(body.expectedRevision) || typeof body.backupRunId !== "string" || !/^\d{1,30}$/.test(body.backupRunId)) return NextResponse.json({ error: "Wpisz osobne potwierdzenie i numer świeżej kopii." }, { status: 400 });
  try {
    const result = await executePrivacyRequest(id, access.admin.id, body.expectedRevision, body.backupRunId);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Wniosek nie został wykonany. Sprawdź aktualną ocenę, retencję, dziennik, kopię i test odtworzenia. Dane częściowo usunięte nie są odtwarzane automatycznie." }, { status: 409 });
  }
}
