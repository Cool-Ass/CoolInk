import { requireAdminPage } from "@/lib/adminPage";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { ASSISTANT_TOOLS } from "@/lib/assistantToolCatalog";
import { prisma } from "@/lib/prisma";
import AssistantPanel from "@/components/admin/AssistantPanel";
export const dynamic = "force-dynamic";
export default async function AssistantPage() {
  const admin = await requireAdminPage("operations.manage");
  const drafts = await prisma.assistantDraft.findMany({ where: { adminUserId: admin.id, project: { client: { deletionRequest: { is: null } } } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, clientId: true, body: true, projectId: true, project: { select: { title: true } } } });
  return <div className="studio-page space-y-5"><header><p className="studio-eyebrow">NARZĘDZIA STUDIA</p><h1 className="studio-page-title">Asystent AI</h1></header><AssistantPanel tools={ASSISTANT_TOOLS.filter(tool => hasAdminPermission(admin.role, tool.permission)).map(tool => tool.name)} initialDrafts={drafts} /></div>;
}
