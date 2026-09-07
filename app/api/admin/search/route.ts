import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(request: Request) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const text = { contains: query, mode: "insensitive" as const };
  const [clients, projects, messages] = await Promise.all([
    prisma.client.findMany({
      where: { OR: [{ firstName: text }, { lastName: text }, { email: text }, { phone: text }] },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.tattooProject.findMany({
      where: { OR: [{ title: text }, { description: text }, { placement: text }, { styles: text }] },
      select: { title: true, kind: true, status: true, client: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.projectMessage.findMany({
      where: { body: text },
      select: { id: true, body: true, project: { select: { title: true, client: { select: { id: true, firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    results: [
      ...clients.map((client) => ({ type: "Klient", label: `${client.firstName} ${client.lastName}`, meta: [client.email, client.phone].filter(Boolean).join(" · "), href: `/admin/clients/${client.id}` })),
      ...projects.map((project) => ({ type: project.kind === "consultation" ? "Konsultacja" : "Projekt", label: project.title, meta: `${project.client.firstName} ${project.client.lastName} · ${project.status}`, href: `/admin/clients/${project.client.id}?view=projects` })),
      ...messages.map((message) => ({ type: "Wiadomość", label: message.project.title, meta: `${message.project.client.firstName} ${message.project.client.lastName} · ${message.body.slice(0, 100)}`, href: `/admin/clients/${message.project.client.id}?view=messages` })),
    ],
  });
}
