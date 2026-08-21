import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteContent } from "@/lib/content";

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json({ content });
}

/** Body: { "hero.heading1": "New heading", "about.body": "..." , ... } */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const entries = Object.entries(body).filter(
    ([, value]) => typeof value === "string"
  ) as [string, string][];

  if (!entries.length) {
    return NextResponse.json({ error: "Nie podano poprawnych ustawień." }, { status: 400 });
  }

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  const content = await getSiteContent();
  return NextResponse.json({ content });
}
