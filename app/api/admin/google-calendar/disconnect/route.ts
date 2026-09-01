import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";
export async function POST(request: Request) { if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); const admin = await getCurrentAdmin(); if (!admin) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }); const connection = await prisma.googleCalendarConnection.findUnique({ where: { adminUserId: admin.id } }); if (!connection) return NextResponse.json({ ok: true }); await prisma.googleCalendarConnection.update({ where: { id: connection.id }, data: { active: false, encryptedRefreshToken: "REVOKED", syncToken: null } }); return NextResponse.json({ ok: true }); }
