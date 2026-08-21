import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }>; }
const STATUSES = new Set(["inquiry", "reviewing", "accepted", "scheduled", "completed", "cancelled"]);

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const project = await prisma.tattooProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const status = typeof body?.status === "string" && STATUSES.has(body.status) ? body.status : project.status;
  const updated = await prisma.tattooProject.update({ where: { id }, data: { status, internalNotes: typeof body?.internalNotes === "string" ? body.internalNotes : project.internalNotes, estimatedPrice: body?.estimatedPrice === "" || body?.estimatedPrice === undefined ? project.estimatedPrice : Number(body.estimatedPrice) || null, finalPrice: body?.finalPrice === "" || body?.finalPrice === undefined ? project.finalPrice : Number(body.finalPrice) || null } });
  return NextResponse.json({ project: updated });
}
