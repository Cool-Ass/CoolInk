import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put as putBlob } from "@vercel/blob";
import {
  getClientAccessToken,
  getCurrentClient,
  getSupabaseConfig,
} from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { sendPushToAdmins } from "@/lib/webPush";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const client = await getCurrentClient();
  const token = await getClientAccessToken();
  const { id } = await params;
  if (!client || !token || !client.supabaseUserId)
    return NextResponse.json(
      { error: "Zaloguj się ponownie, aby przesłać plik." },
      { status: 401 },
    );
  const limit = await rateLimit(request, "client-project-image", 12, 60 * 60_000, client.id);
  if (!limit.allowed) return tooManyRequests(limit);
  const project = await prisma.tattooProject.findFirst({
    where: { id, clientId: client.id },
  });
  if (!project)
    return NextResponse.json(
      { error: "Nie znaleziono tego projektu." },
      { status: 404 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !ALLOWED_TYPES.has(file.type) ||
    file.size > MAX_BYTES
  ) {
    return NextResponse.json(
      { error: "Dodaj JPG, PNG albo WEBP o rozmiarze do 10 MB." },
      { status: 400 },
    );
  }
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const objectPath = `${client.supabaseUserId}/${randomUUID()}.${extension}`;
  let storedLocation = objectPath;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const upload = await putBlob(`project-inspirations/${objectPath}`, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    }).catch(() => null);
    if (!upload)
      return NextResponse.json(
        { error: "Nie udało się bezpiecznie zapisać pliku. Spróbuj ponownie." },
        { status: 502 },
      );
    storedLocation = upload.url;
  } else {
    const { url, key } = getSupabaseConfig();
    const upload = await fetch(
      `${url}/storage/v1/object/project-inspirations/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
          "x-upsert": "false",
        },
        body: file,
        cache: "no-store",
      },
    );
    if (!upload.ok)
      return NextResponse.json(
        { error: "Nie udało się bezpiecznie zapisać pliku. Spróbuj ponownie." },
        { status: 502 },
      );
  }
  const caption =
    String(form.get("caption") ?? "")
      .trim()
      .slice(0, 500) || null;
  const chatMessage = String(form.get("chatMessage") ?? "")
    .trim()
    .slice(0, 2_000);
  const image = await prisma.projectImage.create({
    data: { projectId: project.id, url: storedLocation, caption },
  });
  await prisma.tattooProject.update({ where: { id: project.id }, data: { nextAction: "Sprawdź nową inspirację klienta", nextActionDueAt: new Date() } });
  await sendPushToAdmins({ title: "Nowa inspiracja od klienta", body: `${client.firstName} ${client.lastName} dodał zdjęcie do projektu.`, url: `/admin/clients/${client.id}?view=messages`, tag: `client-image-${image.id}` }).catch(() => undefined);
  if (!chatMessage && form.get("chat") !== "true")
    return NextResponse.json({ imageId: image.id }, { status: 201 });
  const message = await prisma.projectMessage.create({
    data: {
      projectId: project.id,
      author: "client",
      body: chatMessage,
      attachmentId: image.id,
    },
    include: { attachment: { select: { id: true, caption: true } } },
  });
  return NextResponse.json(
    {
      imageId: image.id,
      message: {
        id: message.id,
        author: message.author,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        readAt: null,
        attachment: {
          id: image.id,
          caption: message.attachment?.caption ?? null,
          url: `/api/client/images/${image.id}`,
        },
      },
    },
    { status: 201 },
  );
}
