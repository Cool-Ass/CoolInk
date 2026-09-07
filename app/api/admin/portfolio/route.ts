import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET() {
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.imageUrl) {
    return NextResponse.json(
      { error: "Tytuł i obraz są wymagane." },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.portfolioItem.aggregate({ _max: { order: true } });

  const item = await prisma.portfolioItem.create({
    data: {
      title: body.title,
      description: body.description || null,
      imageUrl: body.imageUrl,
      category: body.category || null,
      tags: body.tags || null,
      published: body.published !== false,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
