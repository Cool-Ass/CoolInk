import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const { id } = await params;
  const existing = await prisma.navItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  await prisma.navItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
