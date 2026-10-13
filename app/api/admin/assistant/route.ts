import { requireAdminApi } from "@/lib/adminApi";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { runAssistantTool, AssistantToolError } from "@/lib/assistantTools";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("operations.manage"); if (!access.ok) return access.response;
  const limit = await rateLimit(request, "assistant-tools", 20, 60000, access.admin.id); if (!limit.allowed) return tooManyRequests(limit);
  try { const raw = await request.text(); if (raw.length > 10000) throw new AssistantToolError("Zbyt duże zapytanie."); return Response.json(await runAssistantTool(access.admin.role, JSON.parse(raw)), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof AssistantToolError ? error.message : "Narzędzie chwilowo niedostępne. Spróbuj ponownie." }, { status: error instanceof AssistantToolError ? error.status : 503 }); }
}
