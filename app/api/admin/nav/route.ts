import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { safeHref } from "@/lib/safeHref";

export async function GET() {
  const access = await requireAdminApi(); if (!access.ok) return access.response;
  const items = await prisma.navItem.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireAdminApi(); if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  const href = safeHref(body?.href, "");
  if (!String(body?.label ?? "").trim() || !href) {
    return NextResponse.json({ error: "Etykieta i link są wymagane." }, { status: 400 });
  }

  const maxOrder = await prisma.navItem.aggregate({ _max: { order: true } });

  const item = await prisma.navItem.create({
    data: {
      label: String(body.label).trim().slice(0, 80),
      href,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
