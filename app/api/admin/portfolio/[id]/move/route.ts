import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const direction = body?.direction;
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json({ error: "kierunek musi być 'up' lub 'down'." }, { status: 400 });
  }

  const current = await prisma.portfolioItem.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  const neighbor = await prisma.portfolioItem.findFirst({
    where:
      direction === "up"
        ? { order: { lt: current.order } }
        : { order: { gt: current.order } },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    return NextResponse.json({ ok: true }); // already at the edge, nothing to do
  }

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    prisma.portfolioItem.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);

  return NextResponse.json({ ok: true });
}
