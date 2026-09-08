import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";
import { requireAdminApi } from "@/lib/adminApi";

const CATEGORIES = new Set(["consent", "preparation", "aftercare", "policy", "other"]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;

  const { id } = await params;
  const existing = await prisma.studioDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const content = sanitizeRichText(String(body?.content ?? "").trim());
  const category = String(body?.category ?? "other");
  if (!title || !content) return NextResponse.json({ error: "Tytuł i treść dokumentu są wymagane." }, { status: 400 });
  if (!CATEGORIES.has(category)) return NextResponse.json({ error: "Nieprawidłowa kategoria dokumentu." }, { status: 400 });

  const contentChanged = title !== existing.title || content !== existing.content || category !== existing.category;
  const document = await prisma.studioDocument.update({
    where: { id },
    data: {
      title,
      content,
      category,
      published: Boolean(body?.published),
      // Every material revision requires a fresh client acceptance. Publishing
      // or hiding the same revision does not create a misleading new version.
      version: contentChanged ? { increment: 1 } : undefined,
    },
  });
  return NextResponse.json({ document });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;

  const { id } = await params;
  const existing = await prisma.studioDocument.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });

  // Acceptance rows intentionally follow the document through the Prisma
  // cascade. The destructive confirmation in the UI states this explicitly.
  await prisma.studioDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
