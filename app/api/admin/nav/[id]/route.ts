import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const access = await requireAdminApi(); if (!access.ok) return access.response;
  const { id } = await params;
  const existing = await prisma.navItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  await prisma.navItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
