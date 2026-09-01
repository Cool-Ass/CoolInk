import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/requestSecurity";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 5000) : "";
  if (!clientId || !title || !description) return NextResponse.json({ error: "Podaj nazwę i opis projektu." }, { status: 400 });
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Klient nie istnieje." }, { status: 404 });
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.tattooProject.create({ data: { clientId, title, description, status: "inquiry" } });
    await tx.projectActivity.create({ data: { projectId: created.id, type: "project_created", message: "Projekt utworzony przez studio.", visibility: "admin" } });
    return created;
  });
  return NextResponse.json({ project }, { status: 201 });
}
