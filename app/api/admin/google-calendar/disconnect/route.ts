import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
import { decryptGoogleRefreshToken } from "@/lib/googleCalendarCrypto";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("settings.manage");
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { adminUserId: admin.id } });
  if (!connection) return NextResponse.json({ ok: true });
  let revokedRemotely = false;
  if (connection.encryptedRefreshToken !== "REVOKED") {
    try {
      const token = decryptGoogleRefreshToken(connection.encryptedRefreshToken);
      const response = await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }), cache: "no-store" });
      revokedRemotely = response.ok;
    } catch { revokedRemotely = false; }
  }
  await prisma.$transaction([
    prisma.googleCalendarEventSync.updateMany({ where: { connectionId: connection.id, appointmentId: null }, data: { syncStatus: "INACTIVE" } }),
    prisma.googleCalendarConnection.update({ where: { id: connection.id }, data: { active: false, encryptedRefreshToken: "REVOKED", syncToken: null } }),
    prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "google-calendar.disconnect", targetType: "GoogleCalendarConnection", targetId: connection.id, summary: revokedRemotely ? "Odwołano dostęp Google Calendar i usunięto lokalny token." : "Usunięto lokalny token Google Calendar; zdalne odwołanie nie zostało potwierdzone.", metadata: JSON.stringify({ revokedRemotely }) } }),
  ]);
  return NextResponse.json({ ok: true, revokedRemotely });
}
