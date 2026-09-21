import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getCurrentClient } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { preparePrivateImage } from "@/lib/privateImageUpload";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";

export async function GET() {
  if (!(await getCurrentAdmin()) && !(await getCurrentClient())) return new Response(null, { status: 401 });
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: "chat_sticker:" } }, take: 30, orderBy: { key: "asc" } });
  return NextResponse.json({ stickers: rows.map((row) => ({ id: row.key, ...JSON.parse(row.value) })) }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return new Response(null, { status: 401 });
  const limit = await rateLimit(request, "chat-stickers", 10, 60_000, admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  if (await prisma.siteSetting.count({ where: { key: { startsWith: "chat_sticker:" } } }) >= 30) return NextResponse.json({ error: "Biblioteka może zawierać do 30 naklejek. Usuń nieużywaną." }, { status: 400 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Wybierz obraz naklejki.");
    const prepared = await preparePrivateImage(file);
    const data = await sharp(prepared.buffer).resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    if (data.length > 128_000) throw new Error("Naklejka jest zbyt duża.");
    const sticker = { name: String(form.get("name") || file.name).slice(0, 80), url: `data:image/webp;base64,${data.toString("base64")}` };
    const key = `chat_sticker:${randomUUID()}`;
    await prisma.siteSetting.create({ data: { key, value: JSON.stringify(sticker) } });
    return NextResponse.json({ sticker: { id: key, ...sticker } }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się dodać naklejki." }, { status: 422 }); }
}
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  if (!(await getCurrentAdmin())) return new Response(null, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^chat_sticker:[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 400 });
  await prisma.siteSetting.deleteMany({ where: { key: id } });
  return NextResponse.json({ ok: true });
}
