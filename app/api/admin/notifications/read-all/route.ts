import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await prisma.contactMessage.updateMany({ where: { isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true, updated: result.count });
}
