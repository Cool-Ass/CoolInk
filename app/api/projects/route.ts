import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { activityMessage } from "@/lib/projectWorkflow";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const limit = rateLimit(request, "project-request", 5, 60 * 60 * 1000);
  if (!limit.allowed) return tooManyRequests(limit);
  const body = await request.json().catch(() => null);
  if (String(body?.website ?? "").trim()) return NextResponse.json({ projectId: "received" }, { status: 201 });
  const firstName = String(body?.firstName ?? "").trim().slice(0, 80);
  const lastName = String(body?.lastName ?? "").trim().slice(0, 80);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 254);
  const description = String(body?.description ?? "").trim().slice(0, 5000);
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || description.length < 12) {
    return NextResponse.json({ error: "Uzupełnij dane kontaktowe i opisz swój pomysł (minimum 12 znaków)." }, { status: 400 });
  }
  const authenticatedClient = await getCurrentClient();
  // A signed-in person always writes to their own profile. This prevents a
  // browser session from accidentally adding a project to another email.
  if (authenticatedClient && authenticatedClient.email !== email) {
    return NextResponse.json({ error: "Dla bezpieczeństwa użyj adresu e-mail przypisanego do Twojego konta." }, { status: 403 });
  }
  const client = authenticatedClient ?? await prisma.client.upsert({
    where: { email },
    update: { firstName, lastName, phone: String(body.phone ?? "").trim() || undefined },
    create: { firstName, lastName, email, phone: String(body.phone ?? "").trim() || null },
  });
  const project = await prisma.tattooProject.create({
    data: {
      clientId: client.id,
      title: String(body.title ?? "Nowy projekt tatuażu").trim().slice(0, 160) || "Nowy projekt tatuażu",
      description,
      styles: Array.isArray(body.styles) ? (body.styles as unknown[]).filter((item: unknown): item is string => typeof item === "string").join(", ") : "",
      placement: String(body.placement ?? "").trim() || null,
      size: String(body.size ?? "").trim() || null,
      colorPreference: String(body.colorPreference ?? "").trim() || null,
      preferredDateNote: String(body.preferredDateNote ?? "").trim().slice(0, 500) || null,
      status: "inquiry",
      activities: { create: { type: "project_created", message: activityMessage("project_created"), visibility: "admin" } },
    },
  });
  return NextResponse.json({ projectId: project.id }, { status: 201 });
}
