import { NextResponse } from "next/server";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { getClientAccessToken, getCurrentClient, getSupabaseConfig } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";

function isBlobLocation(value: string) {
  try {
    return new URL(value).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Streams a private inspiration image only after proving that the current
 * client owns the project. Object paths never become public URLs. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getCurrentClient();
  const token = await getClientAccessToken();
  const { id } = await params;
  if (!client || !token) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const image = await prisma.projectImage.findFirst({ where: { id, project: { clientId: client.id } } });
  if (!image) return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });

  if (isBlobLocation(image.url)) {
    const source = await getBlob(image.url, { access: "private", useCache: false }).catch(() => null);
    if (!source || source.statusCode !== 200 || !source.stream)
      return NextResponse.json({ error: "Plik nie jest obecnie dostępny." }, { status: 502 });
    return new NextResponse(source.stream, {
      headers: {
        "Content-Type": source.blob.contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const { url, key } = getSupabaseConfig();
  const source = await fetch(`${url}/storage/v1/object/authenticated/project-inspirations/${image.url}`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!source.ok || !source.body) return NextResponse.json({ error: "Plik nie jest obecnie dostępny." }, { status: 502 });

  // Existing Supabase objects are migrated on a legitimate owner read. This
  // gives both the client and authenticated studio staff access through the
  // application without ever making an inspiration publicly addressable.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const data = Buffer.from(await source.arrayBuffer());
    const contentType = source.headers.get("Content-Type") ?? "application/octet-stream";
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const migrated = await putBlob(`project-inspirations/migrated/${image.id}.${extension}`, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    }).catch(() => null);
    if (migrated) await prisma.projectImage.update({ where: { id: image.id }, data: { url: migrated.url } });
    return new NextResponse(data, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  }

  return new NextResponse(source.body, { headers: { "Content-Type": source.headers.get("Content-Type") ?? "application/octet-stream", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
