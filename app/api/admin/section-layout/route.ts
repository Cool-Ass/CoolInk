import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { parseSectionLayout } from "@/lib/adminSectionLayout";
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "section-layout", 90, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  if (!["dashboard", "statistics", "settings", "client"].includes(body?.scope)) return NextResponse.json({ error: "Nieznany ekran." }, { status: 400 });
  let layout;
  try { layout = parseSectionLayout(body.layout); } catch { return NextResponse.json({ error: "Nieprawidłowy układ." }, { status: 400 }); }
  const key = `admin_layout:${auth.admin.id}:${body.scope}`;
  const value = JSON.stringify(layout);
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  return NextResponse.json({ ok: true });
}
