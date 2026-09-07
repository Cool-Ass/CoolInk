import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flattenDefaults, getSiteContent } from "@/lib/content";
import { requireAdminApi } from "@/lib/adminApi";
import { writeAdminAudit } from "@/lib/adminAudit";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function GET() {
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;
  const content = await getSiteContent();
  return NextResponse.json({ content });
}

/** Body: { "hero.heading1": "New heading", "about.body": "..." , ... } */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("content.manage");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const allowedKeys = new Set(Object.keys(flattenDefaults()));
  const entries = Object.entries(body).filter(
    ([key, value]) => allowedKeys.has(key) && typeof value === "string" && value.length <= 5_000
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
  await writeAdminAudit({ adminUserId: access.admin.id, action: "settings.update", targetType: "SiteSetting", summary: `Zmieniono ${entries.length} ustawień globalnych.`, metadata: { keys: entries.map(([key]) => key) } });

  revalidatePath("/");
  revalidatePath("/budujemy");

  const content = await getSiteContent();
  return NextResponse.json({ content });
}
