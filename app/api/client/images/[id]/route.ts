import { NextResponse } from "next/server";
import { getClientAccessToken, getCurrentClient, getSupabaseConfig } from "@/lib/clientAuth";
import { prisma } from "@/lib/prisma";

/** Streams a private inspiration image only after proving that the current
 * client owns the project. Object paths never become public URLs. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getCurrentClient();
  const token = await getClientAccessToken();
  const { id } = await params;
  if (!client || !token) return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  const image = await prisma.projectImage.findFirst({ where: { id, project: { clientId: client.id } } });
  if (!image) return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
  const { url, key } = getSupabaseConfig();
  const source = await fetch(`${url}/storage/v1/object/authenticated/project-inspirations/${image.url}`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!source.ok || !source.body) return NextResponse.json({ error: "Plik nie jest obecnie dostępny." }, { status: 502 });
  return new NextResponse(source.body, { headers: { "Content-Type": source.headers.get("Content-Type") ?? "application/octet-stream", "Cache-Control": "private, max-age=300" } });
}
