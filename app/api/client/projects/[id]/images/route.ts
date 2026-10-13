import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put as putBlob } from "@vercel/blob";
import { privateBlobToken, privateBlobObjectLocation } from "@/lib/privateBlob";
import {
  getClientAccessToken,
  getCurrentClient,
  getSupabaseConfig,
} from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { sendPushToAdmins } from "@/lib/webPush";
import { preparePrivateImage, PrivateImageUploadError } from "@/lib/privateImageUpload";
import { isSameOrigin, rateLimit, tooManyRequests } from "@/lib/requestSecurity";
import { privateImageUrl } from "@/lib/privateMedia";
import { withClientMediaWrite } from "@/lib/clientMediaWrite";

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
  const healing = form.get("kind") === "healing";
  const healingAppointmentId = healing ? String(form.get("appointmentId") || "") : null;
  if (healing && !await prisma.appointment.findFirst({ where: { id: healingAppointmentId!, status: "completed", projectId: project.id, project: { clientId: client.id, kind: "tattoo" } }, select: { id: true } })) return NextResponse.json({ error: "Nie znaleziono zakończonej sesji." }, { status: 404 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nie przesłano pliku." }, { status: 400 });
  let prepared: Awaited<ReturnType<typeof preparePrivateImage>>;
  try { prepared = await preparePrivateImage(file); }
  catch (error) { return NextResponse.json({ error: error instanceof PrivateImageUploadError ? error.message : "Nie udało się odczytać obrazu." }, { status: 422 }); }
  const { image, chatMessage } = await withClientMediaWrite(client.id, async (tx, track) => {
  if (healing && !await tx.appointment.findFirst({ where: { id: healingAppointmentId!, status: "completed", projectId: project.id, project: { clientId: client.id } }, select: { id: true } })) throw Error("AFTERCARE_VISIT_UNAVAILABLE");
  if (healing && await tx.projectImage.count({ where: { appointmentId: healingAppointmentId, kind: "healing" } }) >= 24) throw Error("AFTERCARE_IMAGE_LIMIT");
  const objectPath = `${client.supabaseUserId}/${randomUUID()}.${prepared.extension}`;
  let storedLocation = objectPath;
  const blobToken = privateBlobToken();
  track(blobToken ? privateBlobObjectLocation(`project-inspirations/${objectPath}`) : objectPath);
  if (blobToken) {
    const upload = await putBlob(`project-inspirations/${objectPath}`, prepared.buffer, {
      access: "private",
      token: blobToken,
      addRandomSuffix: false,
      contentType: prepared.contentType,
      abortSignal: AbortSignal.timeout(15000),
    }).catch(() => null);
    if (!upload) throw new Error("Nie udało się bezpiecznie zapisać pliku.");
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
          "Content-Type": prepared.contentType,
          "x-upsert": "false",
          "cache-control": "no-store, max-age=0",
        },
        body: prepared.buffer,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      },
    );
    if (!upload.ok) throw new Error("Nie udało się bezpiecznie zapisać pliku.");
  }
  const caption =
    String(form.get("caption") ?? "")
      .trim()
      .slice(0, 500) || null;
  const chatMessage = String(form.get("chatMessage") ?? "")
    .trim()
    .slice(0, 2_000);
  track(storedLocation);
    const created = await tx.projectImage.create({ data: { projectId: project.id, url: storedLocation, caption, ...(healing ? { kind: "healing", appointmentId: healingAppointmentId } : {}) } });
    await tx.tattooProject.update({ where: { id: project.id }, data: { nextAction: healing ? "Sprawdź zdjęcie gojenia" : "Sprawdź nową inspirację klienta", nextActionDueAt: new Date() } });
    await tx.projectActivity.create({ data: { projectId: project.id, type: healing ? "aftercare_photo" : "inspiration_added_by_client", message: healing ? "Klient dodał prywatne zdjęcie gojenia." : "Klient dodał nową inspirację do projektu.", visibility: "admin" } });
    return { image: created, chatMessage };
  });
  await sendPushToAdmins({ title: "Nowa inspiracja od klienta", body: `${client.firstName} ${client.lastName} dodał zdjęcie do projektu.`, url: `/admin/clients/${client.id}?view=projects`, tag: `client-image-${image.id}` }).catch(() => undefined);
  if (!chatMessage && form.get("chat") !== "true")
    return NextResponse.json({ imageId: image.id, image: { id: image.id, caption: image.caption, createdAt: image.createdAt.toISOString(), url: privateImageUrl(image.id, "client", client.id) } }, { status: 201 });
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
          url: privateImageUrl(image.id, "client", client.id),
        },
      },
    },
    { status: 201 },
  );
}
