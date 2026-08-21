import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.navItem.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.label || !body?.href) {
    return NextResponse.json({ error: "Etykieta i link są wymagane." }, { status: 400 });
  }

  const maxOrder = await prisma.navItem.aggregate({ _max: { order: true } });

  const item = await prisma.navItem.create({
    data: {
      label: body.label,
      href: body.href,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
