import { get as getBlob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";
import { verifyPrivateImageToken } from "@/lib/privateMedia";

function isBlobLocation(value: string) {
  try {
    return new URL(value).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Streams a private project inspiration only to an authenticated studio user. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin)
    return NextResponse.json({ error: "Brak dostępu administratora." }, { status: 401 });

  const { id } = await params;
  if (!verifyPrivateImageToken(request, id, "admin", admin.id)) return NextResponse.json({ error: "Link wygasł. Odśwież widok." }, { status: 403 });
  const image = await prisma.projectImage.findUnique({ where: { id }, select: { url: true } });
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

  // Compatibility for legacy Supabase objects. Private Vercel Blob is used
  // for every new upload; a service role additionally unlocks older files for
  // staff before their automatic owner-read migration runs.
  const { url } = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Starszy prywatny plik wymaga konfiguracji SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  const source = await fetch(`${url}/storage/v1/object/authenticated/project-inspirations/${image.url}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!source.ok || !source.body)
    return NextResponse.json({ error: "Starszy plik zostanie udostępniony po ponownym otwarciu go przez klienta." }, { status: 502 });

  return new NextResponse(source.body, {
    headers: {
      "Content-Type": source.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
