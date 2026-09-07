import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { getTattooStyles, saveTattooStyles, type TattooStyle } from "@/lib/tattooStyles";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function GET() {
  const access = await requireAdminApi("settings.manage");
  if (!access.ok) return access.response;
  return NextResponse.json({ styles: await getTattooStyles() });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const access = await requireAdminApi("settings.manage");
  if (!access.ok) return access.response;
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.styles)) return NextResponse.json({ error: "Nieprawidłowa lista stylów." }, { status: 400 });
  const styles = body.styles.filter((item: unknown): item is TattooStyle => Boolean(item) && typeof item === "object" && typeof (item as TattooStyle).id === "string" && typeof (item as TattooStyle).label === "string" && typeof (item as TattooStyle).active === "boolean");
  if (styles.length !== body.styles.length) return NextResponse.json({ error: "Nieprawidłowa lista stylów." }, { status: 400 });
  const saved = await saveTattooStyles(styles);
  return NextResponse.json({ styles: saved });
}
