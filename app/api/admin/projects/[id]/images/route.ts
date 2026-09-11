import { randomUUID } from "node:crypto";
import { del as deleteBlob, put as putBlob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";
import { getSupabaseConfig } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { preparePrivateImage, PrivateImageUploadError } from "@/lib/privateImageUpload";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";

type Params = { params: Promise<{ id: string }> };

function isBlobUrl(value: string) {
  try { return new URL(value).hostname.endsWith(".blob.vercel-storage.com"); } catch { return false; }
}

export async function POST(request: Request, { params }: Params) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const limit = await rateLimit(request, "admin-project-image", 20, 60 * 60_000, access.admin.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const project = await prisma.tattooProject.findUnique({ where: { id }, select: { id: true, clientId: true, title: true } });
  if (!project) return NextResponse.json({ error: "Projekt nie istnieje." }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nie przesłano pliku." }, { status: 400 });
  let prepared: Awaited<ReturnType<typeof preparePrivateImage>>;
  try { prepared = await preparePrivateImage(file); }
  catch (error) { return NextResponse.json({ error: error instanceof PrivateImageUploadError ? error.message : "Nie udało się odczytać obrazu." }, { status: 422 }); }
  const objectPath = `admin/${project.clientId}/${randomUUID()}.${prepared.extension}`;
  let storedLocation = objectPath;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const upload = await putBlob(`project-inspirations/${objectPath}`, prepared.buffer, { access: "private", addRandomSuffix: false, contentType: prepared.contentType }).catch(() => null);
    if (!upload) return NextResponse.json({ error: "Nie udało się bezpiecznie zapisać pliku." }, { status: 502 });
    storedLocation = upload.url;
  } else {
    const { url } = getSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Prywatny magazyn inspiracji nie jest skonfigurowany." }, { status: 503 });
    const upload = await fetch(`${url}/storage/v1/object/project-inspirations/${objectPath}`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": prepared.contentType, "x-upsert": "false" }, body: prepared.buffer, cache: "no-store" });
    if (!upload.ok) return NextResponse.json({ error: "Nie udało się bezpiecznie zapisać pliku." }, { status: 502 });
  }
  const caption = String(form?.get("caption") ?? "").trim().slice(0, 500) || null;
  const image = await prisma.projectImage.create({ data: { projectId: id, url: storedLocation, caption } });
  await prisma.projectActivity.create({ data: { projectId: id, type: "inspiration_added_by_studio", message: "Studio dodało inspirację do projektu.", visibility: "client" } });
  return NextResponse.json({ image: { id: image.id, caption: image.caption, url: `/api/admin/images/${image.id}` } }, { status: 201 });
}

export async function DELETE(request: Request, { params }: Params) {
  const access = await requireAdminApi("operations.manage");
  if (!access.ok) return access.response;
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const imageId = new URL(request.url).searchParams.get("imageId") ?? "";
  const image = await prisma.projectImage.findFirst({ where: { id: imageId, projectId: id }, select: { id: true, url: true } });
  if (!image) return NextResponse.json({ error: "Nie znaleziono inspiracji." }, { status: 404 });
  await prisma.projectImage.delete({ where: { id: image.id } });
  if (isBlobUrl(image.url) && process.env.BLOB_READ_WRITE_TOKEN) await deleteBlob(image.url).catch(() => undefined);
  else if (!isBlobUrl(image.url)) {
    const { url } = getSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) await fetch(`${url}/storage/v1/object/project-inspirations/${image.url}`, { method: "DELETE", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
