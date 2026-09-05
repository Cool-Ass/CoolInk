import { NextResponse } from "next/server";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { webPushPublicKey } from "@/lib/webPush";

export async function GET() {
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  return NextResponse.json({ publicKey: webPushPublicKey(), subscriptions: await prisma.pushSubscription.count({ where: { clientId: client.id } }) });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "").slice(0, 2_000);
  const p256dh = String(body?.keys?.p256dh ?? "").slice(0, 500);
  const auth = String(body?.keys?.auth ?? "").slice(0, 500);
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return NextResponse.json({ error: "Nieprawidłowa subskrypcja powiadomień." }, { status: 400 });
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { clientId: true } });
  if (existing && existing.clientId !== client.id) return NextResponse.json({ error: "Ta subskrypcja należy do innego konta." }, { status: 409 });
  await prisma.pushSubscription.upsert({ where: { endpoint }, update: { p256dh, auth, userAgent: request.headers.get("user-agent")?.slice(0, 500) }, create: { clientId: client.id, endpoint, p256dh, auth, userAgent: request.headers.get("user-agent")?.slice(0, 500) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  if (!client) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  await prisma.pushSubscription.deleteMany({ where: { clientId: client.id, endpoint } });
  return NextResponse.json({ ok: true });
}
