import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { sanitizeRichText } from "@/lib/richText";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim(); const content = sanitizeRichText(String(body?.content ?? "").trim()); const category = String(body?.category ?? "other");
  if (!title || !content) return NextResponse.json({ error: "Tytuł i treść dokumentu są wymagane." }, { status: 400 });
  let slug = slugify(title); if (!slug) slug = `dokument-${Date.now()}`;
  const exists = await prisma.studioDocument.findUnique({ where: { slug } }); if (exists) slug = `${slug}-${Date.now().toString(36)}`;
  const document = await prisma.studioDocument.create({ data: { title, slug, content, category, published: Boolean(body?.published) } });
  return NextResponse.json({ document }, { status: 201 });
}
