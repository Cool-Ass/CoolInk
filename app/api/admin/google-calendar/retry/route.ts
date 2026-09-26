import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { retryGoogleCalendarExports } from "@/lib/googleCalendarSyncEngine";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ pending: await prisma.siteSetting.count({ where: { key: { startsWith: "google_retry:" } } }) });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  const limit = await rateLimit(request, "google-retry", 3, 60_000, auth.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  return NextResponse.json(await retryGoogleCalendarExports());
}
