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
  const result = parsed.kind === "messages"
    ? await prisma.projectMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), author: "client", readAt: null }, data: { readAt: now } })
    : await prisma.contactMessage.updateMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true, updated: result.count });
}

export async function DELETE(request: Request) {
  const parsed = await input(request);
  if ("error" in parsed) return parsed.error;
  const result = parsed.kind === "messages"
    ? await prisma.projectMessage.deleteMany({ where: { ...(parsed.id === "all" ? {} : { id: parsed.id }), author: "client" } })
    : await prisma.contactMessage.deleteMany({ where: parsed.id === "all" ? {} : { id: parsed.id } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
