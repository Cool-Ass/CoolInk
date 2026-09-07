import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { writeAdminAudit } from "@/lib/adminAudit";
import { getMessageTemplates, parseMessageTemplates } from "@/lib/messageTemplates";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function GET() {
  const auth = await requireAdminApi("operations.manage");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ templates: await getMessageTemplates() });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const auth = await requireAdminApi("operations.manage");
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.templates) || body.templates.length > 20) return NextResponse.json({ error: "Możesz zapisać maksymalnie 20 odpowiedzi." }, { status: 400 });
  const templates = parseMessageTemplates(JSON.stringify(body.templates));
  await prisma.siteSetting.upsert({ where: { key: "message_templates" }, create: { key: "message_templates", value: JSON.stringify(templates) }, update: { value: JSON.stringify(templates) } });
  await writeAdminAudit({ adminUserId: auth.admin.id, action: "message_templates.update", targetType: "SiteSetting", targetId: "message_templates", summary: `Zapisano ${templates.length} szybkich odpowiedzi.` });
  return NextResponse.json({ templates });
}
