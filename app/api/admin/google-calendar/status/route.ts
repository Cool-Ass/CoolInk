import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { adminUserId: auth.admin.id }, include: { selections: { orderBy: { role: "asc" } } } });
  return NextResponse.json({ connection: connection ? { id: connection.id, accountEmail: connection.accountEmail, primaryCalendarId: connection.primaryCalendarId, lastSyncedAt: connection.lastSyncedAt, active: connection.active, selections: connection.selections.map((item) => ({ calendarId: item.calendarId, summary: item.summary, role: item.role, enabled: item.enabled })) } : null });
}
