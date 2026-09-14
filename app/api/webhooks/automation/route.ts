import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reserveWebhook, verifyWebhookSignature } from "@/lib/webhookSecurity";

export async function POST(request: Request) {
  const secret = process.env.AUTOMATION_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "Webhook wyłączony." }, { status: 503 });
  const body = await request.text();
  const signature = request.headers.get("x-coolink-signature");
  if (!verifyWebhookSignature(body, signature, secret)) return NextResponse.json({ error: "Nieprawidłowy podpis." }, { status: 401 });
  const eventId = request.headers.get("x-coolink-event-id")?.trim();
  if (!eventId || eventId.length > 200) return NextResponse.json({ error: "Brak identyfikatora zdarzenia." }, { status: 400 });
  const reserved = await reserveWebhook("automation", eventId, signature || "");
  if (reserved.duplicate) return NextResponse.json({ ok: true, duplicate: true });
  try {
    const event = JSON.parse(body) as { type?: unknown };
    if (event.type !== "healthcheck") throw new Error("Nieobsługiwany typ zdarzenia.");
    await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "processed", processedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : "Błąd", processedAt: new Date() } });
    return NextResponse.json({ error: "Nieprawidłowe zdarzenie." }, { status: 400 });
  }
}
