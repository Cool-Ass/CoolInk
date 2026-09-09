import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin } from "@/lib/requestSecurity";

type InboxKind = "messages" | "notifications";

async function input(request: Request) {
  const client = await getCurrentClient();
  if (!client) return { error: NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 }) };
  if (!isSameOrigin(request)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const body = await request.json().catch(() => null);
  const kind = String(body?.kind ?? "") as InboxKind;
  const id = String(body?.id ?? "");
  if (!(["messages", "notifications"] as string[]).includes(kind) || !id) return { error: NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 }) };
  return { client, kind, id };
}

export async function PATCH(request: Request) {
  const parsed = await input(request);
  if ("error" in parsed) return parsed.error;
  const now = new Date();
  if (parsed.kind === "messages") {
    const directId = parsed.id.startsWith("direct:") ? parsed.id.slice(7) : null;
    const [projectResult, directResult] = await Promise.all([
      directId ? Promise.resolve({ count: 0 }) : prisma.projectMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), author: "admin", readAt: null, project: { clientId: parsed.client.id } }, data: { readAt: now } }),
      parsed.id === "all" || directId ? prisma.directMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: directId! }), clientId: parsed.client.id, author: "admin", readAt: null }, data: { readAt: now } }) : Promise.resolve({ count: 0 }),
    ]);
    return NextResponse.json({ ok: true, updated: projectResult.count + directResult.count });
  }
  const result = await prisma.clientNotification.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), clientId: parsed.client.id, readAt: null }, data: { readAt: now } });
  return NextResponse.json({ ok: true, updated: result.count });
}

export async function DELETE(request: Request) {
  const parsed = await input(request);
  if ("error" in parsed) return parsed.error;
  if (parsed.kind === "messages") {
    const directId = parsed.id.startsWith("direct:") ? parsed.id.slice(7) : null;
    const [projectResult, directResult] = await Promise.all([
      directId ? Promise.resolve({ count: 0 }) : prisma.projectMessage.deleteMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), author: "admin", project: { clientId: parsed.client.id } } }),
      parsed.id === "all" || directId ? prisma.directMessage.deleteMany({ where: { ...(parsed.id === "all" ? {} : { id: directId! }), clientId: parsed.client.id, author: "admin" } }) : Promise.resolve({ count: 0 }),
    ]);
    return NextResponse.json({ ok: true, deleted: projectResult.count + directResult.count });
  }
  const result = await prisma.clientNotification.deleteMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), clientId: parsed.client.id } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
