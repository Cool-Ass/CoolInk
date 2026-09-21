import { parseDocumentFields } from "@/lib/documentForms";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { sanitizeRichText } from "@/lib/richText";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage"); if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  let formFields: string;
  try { formFields = JSON.stringify(parseDocumentFields(body?.formFields)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nieprawidłowy formularz." }, { status: 400 }); }
  const title = String(body?.title ?? "").trim(); const content = sanitizeRichText(String(body?.content ?? "").trim()); const category = String(body?.category ?? "other");
  if (!title || !content) return NextResponse.json({ error: "Tytuł i treść dokumentu są wymagane." }, { status: 400 });
  let slug = slugify(title); if (!slug) slug = `dokument-${Date.now()}`;
  const exists = await prisma.studioDocument.findUnique({ where: { slug } }); if (exists) slug = `${slug}-${Date.now().toString(36)}`;
  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.studioDocument.create({ data: { title, slug, content, formFields, category, published: Boolean(body?.published) } });
    await tx.studioDocumentVersion.create({ data: { documentId: created.id, version: created.version, title: created.title, content: created.content, formFields: created.formFields, category: created.category } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "document.create", targetType: "StudioDocument", targetId: created.id, summary: `Utworzono dokument „${created.title}”.`, metadata: JSON.stringify({ version: created.version, published: created.published }) } });
    return created;
  });
  return NextResponse.json({ document }, { status: 201 });
}
