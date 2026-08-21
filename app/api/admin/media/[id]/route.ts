import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/media";
import { getMediaUsageMap } from "@/lib/mediaUsage";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  const media = await prisma.media.update({
    where: { id },
    data: { alt: typeof body?.alt === "string" ? body.alt : existing.alt },
  });
  return NextResponse.json({ media });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.media.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });

  const usage = await getMediaUsageMap();
  const usedIn = usage.get(existing.url) ?? [];
  if (usedIn.length > 0) {
    return NextResponse.json(
      {
        error: `Nie można usunąć pliku, ponieważ jest używany w: ${usedIn.join(", ")}. Najpierw podmień go w tych miejscach.`,
      },
      { status: 409 }
    );
  }

  await prisma.media.delete({ where: { id } });
  await deleteUploadedFile(existing.url).catch(() => {});

  return NextResponse.json({ ok: true });
}
