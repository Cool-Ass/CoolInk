import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { parseBookingDraft } from "@/lib/bookingDraft";

export async function GET() {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const row = await prisma.client.findUnique({ where: { id: client.id }, select: { bookingDraft: true } });
  return NextResponse.json({ draft: row?.bookingDraft ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  const limit = await rateLimit(request, "booking-draft", 30, 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => undefined);
  let draft;
  try { draft = body === null ? Prisma.DbNull : parseBookingDraft(body); }
  catch { return NextResponse.json({ error: "Nieprawidłowy lub zbyt długi szkic." }, { status: 400 }); }
  await prisma.client.update({ where: { id: client.id }, data: { bookingDraft: draft } });
  return NextResponse.json({ ok: true });
}
