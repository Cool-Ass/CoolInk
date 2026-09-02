import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getTattooStyles, saveTattooStyles, type TattooStyle } from "@/lib/tattooStyles";
import { isSameOrigin } from "@/lib/requestSecurity";

export async function GET() { if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }); return NextResponse.json({ styles: await getTattooStyles() }); }
export async function PUT(request: Request) { if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); if (!(await getCurrentAdmin())) return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 }); const body = await request.json().catch(() => null); if (!Array.isArray(body?.styles)) return NextResponse.json({ error: "Nieprawidłowa lista stylów." }, { status: 400 }); const styles = body.styles.filter((item: unknown): item is TattooStyle => Boolean(item) && typeof item === "object" && typeof (item as TattooStyle).id === "string" && typeof (item as TattooStyle).label === "string" && typeof (item as TattooStyle).active === "boolean"); if (styles.length !== body.styles.length) return NextResponse.json({ error: "Nieprawidłowa lista stylów." }, { status: 400 }); return NextResponse.json({ styles: await saveTattooStyles(styles) }); }
