import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";
import { parseModules } from "@/lib/pageModules";
import { isSameOrigin } from "@/lib/requestSecurity";

interface Params {
  params: Promise<{ id: string; revisionId: string }>;
}

export async function POST(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;
  const { id, revisionId } = await params;
  const revision = await prisma.pageRevision.findFirst({
    where: { id: revisionId, pageId: id },
  });
  if (!revision) return NextResponse.json({ error: "Nie znaleziono tej wersji strony." }, { status: 404 });

  const page = await prisma.$transaction(async (tx) => {
    const updated = await tx.page.update({
      where: { id },
      data: { modules: revision.modules },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: access.admin.id,
        action: "page.revision.restore",
        targetType: "Page",
        targetId: id,
        summary: `Przywrócono wersję ${revision.version} strony „${updated.title}” jako szkic.`.slice(0, 500),
        metadata: JSON.stringify({ revisionId, version: revision.version }),
      },
    });
    return updated;
  });

  return NextResponse.json({
    page,
    modules: parseModules(revision.modules),
    revision: { id: revision.id, version: revision.version, createdAt: revision.createdAt },
  });
}
