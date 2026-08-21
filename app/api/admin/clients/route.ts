import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const firstName = String(body?.firstName ?? "").trim();
  const lastName = String(body?.lastName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!firstName || !lastName || !email.includes("@")) {
    return NextResponse.json({ error: "Podaj imię, nazwisko i poprawny e-mail." }, { status: 400 });
  }
  const exists = await prisma.client.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Klient z tym e-mailem już istnieje." }, { status: 409 });
  const client = await prisma.client.create({ data: { firstName, lastName, email, phone: String(body.phone ?? "").trim() || null, tags: String(body.tags ?? "").trim() } });
  return NextResponse.json({ client }, { status: 201 });
}
