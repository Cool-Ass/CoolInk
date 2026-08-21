import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });

  const existing = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  const item = await prisma.portfolioItem.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title : existing.title,
      description: body.description ?? existing.description,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : existing.imageUrl,
      category: body.category ?? existing.category,
      tags: body.tags ?? existing.tags,
      published: typeof body.published === "boolean" ? body.published : existing.published,
      order: body.order !== undefined ? Number(body.order) : existing.order,
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  await prisma.portfolioItem.delete({ where: { id } });
  // The image may also be used by a page or be present in the media library.
  // Files are deleted only from the media library, after a usage check.

  return NextResponse.json({ ok: true });
}
