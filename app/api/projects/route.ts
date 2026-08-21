import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClient } from "@/lib/clientAuth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const description = String(body?.description ?? "").trim();
  if (!firstName || !lastName || !email.includes("@") || description.length < 12) {
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
      title: String(body.title ?? "Nowy projekt tatuażu").trim() || "Nowy projekt tatuażu",
      description,
      styles: Array.isArray(body.styles) ? (body.styles as unknown[]).filter((item: unknown): item is string => typeof item === "string").join(", ") : "",
      placement: String(body.placement ?? "").trim() || null,
      size: String(body.size ?? "").trim() || null,
      colorPreference: String(body.colorPreference ?? "").trim() || null,
      preferredDateNote: String(body.preferredDateNote ?? "").trim() || null,
      status: "inquiry",
    },
  });
  return NextResponse.json({ projectId: project.id }, { status: 201 });
}
