import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { webPushPublicKey } from "@/lib/webPush";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const subscriptions = await prisma.adminPushSubscription.findMany({ where: { adminUserId: admin.id }, select: { endpoint: true } });
  return NextResponse.json({ publicKey: webPushPublicKey(), subscriptions: subscriptions.length, endpoints: subscriptions.map((item) => item.endpoint) });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "").slice(0, 2_000);
  const p256dh = String(body?.keys?.p256dh ?? "").slice(0, 500);
  const auth = String(body?.keys?.auth ?? "").slice(0, 500);
  if (!endpoint.startsWith("https://") || !p256dh || !auth) return NextResponse.json({ error: "Nieprawidłowa subskrypcja powiadomień." }, { status: 400 });
  const existing = await prisma.adminPushSubscription.findUnique({ where: { endpoint }, select: { adminUserId: true } });
  if (existing && existing.adminUserId !== admin.id) return NextResponse.json({ error: "Ta subskrypcja należy do innego konta administratora." }, { status: 409 });
  await prisma.adminPushSubscription.upsert({ where: { endpoint }, update: { p256dh, auth, userAgent: request.headers.get("user-agent")?.slice(0, 500) }, create: { adminUserId: admin.id, endpoint, p256dh, auth, userAgent: request.headers.get("user-agent")?.slice(0, 500) } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "");
  await prisma.adminPushSubscription.deleteMany({ where: { adminUserId: admin.id, endpoint } });
  return NextResponse.json({ ok: true });
}
