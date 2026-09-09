import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";

type InboxKind = "messages" | "notifications";

async function input(request: Request) {
  if (!(await getCurrentAdmin())) return { error: NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }) };
  if (!isSameOrigin(request)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const body = await request.json().catch(() => null);
  const kind = String(body?.kind ?? "") as InboxKind;
  const id = String(body?.id ?? "");
  if (!(["messages", "notifications"] as string[]).includes(kind) || !id) return { error: NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 }) };
  return { kind, id };
}

export async function PATCH(request: Request) {
  const parsed = await input(request);
  if ("error" in parsed) return parsed.error;
  const now = new Date();
  if (parsed.kind === "messages") {
    const directId = parsed.id.startsWith("direct:") ? parsed.id.slice(7) : null;
    const [projectResult, directResult] = await Promise.all([
      directId ? Promise.resolve({ count: 0 }) : prisma.projectMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), author: "client", readAt: null }, data: { readAt: now } }),
      parsed.id === "all" || directId ? prisma.directMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: directId! }), author: "client", readAt: null }, data: { readAt: now } }) : Promise.resolve({ count: 0 }),
    ]);
    return NextResponse.json({ ok: true, updated: projectResult.count + directResult.count });
  }
  const result = await prisma.contactMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true, updated: result.count });
}

export async function DELETE(request: Request) {
  const parsed = await input(request);
  if ("error" in parsed) return parsed.error;
  if (parsed.kind === "messages") {
    const directId = parsed.id.startsWith("direct:") ? parsed.id.slice(7) : null;
    const [projectResult, directResult] = await Promise.all([
      directId ? Promise.resolve({ count: 0 }) : prisma.projectMessage.deleteMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), author: "client" } }),
      parsed.id === "all" || directId ? prisma.directMessage.deleteMany({ where: { ...(parsed.id === "all" ? {} : { id: directId! }), author: "client" } }) : Promise.resolve({ count: 0 }),
    ]);
    return NextResponse.json({ ok: true, deleted: projectResult.count + directResult.count });
  }
  const result = await prisma.contactMessage.deleteMany({ where: parsed.id === "all" ? {} : { id: parsed.id } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
