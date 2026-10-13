import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";
import { withClientMediaWrite } from "@/lib/clientMediaWrite";
export async function GET() {
  const access = await requireAdminApi("operations.manage"); if (!access.ok) return access.response;
  return Response.json({ drafts: await prisma.assistantDraft.findMany({ where: { adminUserId: access.admin.id, project: { client: { deletionRequest: { is: null } } } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, clientId: true, body: true, createdAt: true, projectId: true, project: { select: { title: true } } } }) }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("operations.manage"); if (!access.ok) return access.response;
  const limit = await rateLimit(request, "assistant-drafts", 30, 3600000, access.admin.id); if (!limit.allowed) return tooManyRequests(limit);
  const data = await request.json().catch(() => null);
  if (typeof data?.projectId !== "string" || typeof data?.body !== "string" || !data.body.trim() || data.body.length > 4000) return Response.json({ error: "Wybierz projekt i wpisz szkic do 4000 znaków." }, { status: 400 });
  const project = await prisma.tattooProject.findFirst({ where: { id: data.projectId, client: { deletionRequest: { is: null } } }, select: { id: true, clientId: true } });
  if (!project) return Response.json({ error: "Nie znaleziono projektu." }, { status: 404 });
  try {
    const draft = await withClientMediaWrite(project.clientId, async tx => {
      const fresh = await tx.tattooProject.findFirst({ where: { id: project.id, clientId: project.clientId } }); if (!fresh) return null;
      return tx.assistantDraft.create({ data: { projectId: project.id, clientId: project.clientId, adminUserId: access.admin.id, body: data.body.trim() }, select: { id: true } });
    });
    return draft ? Response.json({ draft }, { status: 201 }) : Response.json({ error: "Projekt nie jest już dostępny." }, { status: 409 });
  } catch { return Response.json({ error: "Nie udało się zapisać szkicu." }, { status: 503 }); }
}
