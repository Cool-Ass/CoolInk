import { parseDocumentFields } from "@/lib/documentForms";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/richText";
import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin } from "@/lib/requestSecurity";

const CATEGORIES = new Set(["consent", "preparation", "aftercare", "policy", "other"]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;

  const { id } = await params;
  const existing = await prisma.studioDocument.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });

  const body = await request.json().catch(() => null);
  let formFields: string;
  try { formFields = JSON.stringify(parseDocumentFields(body?.formFields)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nieprawidłowy formularz." }, { status: 400 }); }
  const title = String(body?.title ?? "").trim();
  const content = sanitizeRichText(String(body?.content ?? "").trim());
  const category = String(body?.category ?? "other");
  if (!title || !content) return NextResponse.json({ error: "Tytuł i treść dokumentu są wymagane." }, { status: 400 });
  if (!CATEGORIES.has(category)) return NextResponse.json({ error: "Nieprawidłowa kategoria dokumentu." }, { status: 400 });

  const contentChanged = title !== existing.title || content !== existing.content || category !== existing.category || formFields !== existing.formFields;
  const document = await prisma.$transaction(async (tx) => {
    const updated = await tx.studioDocument.update({
      where: { id },
      data: {
        title,
        content,
        formFields,
        category,
        published: Boolean(body?.published),
        // Every material revision requires a fresh client acceptance. Publishing
        // or hiding the same revision does not create a misleading new version.
        version: contentChanged ? { increment: 1 } : undefined,
      },
    });
    if (contentChanged) await tx.studioDocumentVersion.create({ data: { documentId: updated.id, version: updated.version, title: updated.title, content: updated.content, formFields: updated.formFields, category: updated.category } });
    await tx.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: contentChanged ? "document.revise" : "document.publish", targetType: "StudioDocument", targetId: updated.id, summary: contentChanged ? `Utworzono wersję ${updated.version} dokumentu „${updated.title}”.` : `Zmieniono widoczność dokumentu „${updated.title}”.`, metadata: JSON.stringify({ version: updated.version, published: updated.published }) } });
    return updated;
  });
  return NextResponse.json({ document });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;

  const { id } = await params;
  const existing = await prisma.studioDocument.findUnique({
    where: { id },
    select: { id: true, _count: { select: { acceptances: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });

  if (existing._count.acceptances > 0) {
    await prisma.$transaction([
      prisma.studioDocument.update({ where: { id }, data: { published: false, archivedAt: new Date() } }),
      prisma.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "document.archive", targetType: "StudioDocument", targetId: id, summary: "Zarchiwizowano zaakceptowany dokument wraz z jego historią." } }),
    ]);
    return NextResponse.json({ ok: true, archived: true });
  }
  await prisma.$transaction([
    prisma.adminAuditLog.create({ data: { adminUserId: access.admin.id, action: "document.delete", targetType: "StudioDocument", targetId: id, summary: "Usunięto dokument bez akceptacji klientów." } }),
    prisma.studioDocument.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true, archived: false });
}
