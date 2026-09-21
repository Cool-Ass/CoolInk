import { randomUUID } from "node:crypto";
import { put, get } from "@vercel/blob";
import { preparePrivateImage } from "@/lib/privateImageUpload";
import { isPrivateBlobLocation, privateImageUrl } from "@/lib/privateMedia";
import { NextResponse } from "next/server";

export async function readChatInput(request: Request, owner: string) {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    const input = await request.json();
    return { body: String(input?.body ?? "").trim(), imageUrl: null };
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Wybierz zdjęcie.");
  const body = String(form.get("chatMessage") ?? "").trim();
  if (body.length > 2000) throw new Error("Wiadomość może mieć do 2000 znaków.");
  const prepared = await preparePrivateImage(file);
  const path = `chat/${owner}/${randomUUID()}.webp`;
  let imageUrl: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    imageUrl = (await put(`project-inspirations/${path}`, prepared.buffer, { access: "private", contentType: prepared.contentType, addRandomSuffix: false })).url;
  } else {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!key || !url) throw new Error("Prywatny magazyn zdjęć nie jest skonfigurowany.");
    const response = await fetch(`${url}/storage/v1/object/project-inspirations/${path}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": prepared.contentType }, body: prepared.buffer });
    if (!response.ok) throw new Error("Nie udało się zapisać zdjęcia.");
    imageUrl = path;
  }
  return { body, imageUrl };
}
export function serializeDirectMessage(message: { id: string; author: string; body: string; imageUrl?: string | null; createdAt: Date; readAt: Date | null }, role: "admin" | "client", subject: string) {
  return { id: message.id, author: message.author, body: message.body, createdAt: message.createdAt.toISOString(), readAt: message.readAt?.toISOString() ?? null, attachment: message.imageUrl ? { id: message.id, caption: "Zdjęcie", url: privateImageUrl(message.id, role, subject).replace("/images/", "/chat-images/") } : null };
}
export async function streamChatImage(location: string) {
  const headers = { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (isPrivateBlobLocation(location)) {
    const source = await get(location, { access: "private", useCache: false }).catch(() => null);
    if (source?.statusCode === 200 && source.stream) return new NextResponse(source.stream, { headers });
  } else if (/^chat\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9-]+\.webp$/.test(location)) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (key) {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/project-inspirations/${location}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
      if (response.ok) return new NextResponse(response.body, { headers });
    }
  }
  return NextResponse.json({ error: "Zdjęcie jest obecnie niedostępne." }, { status: 502 });
}
