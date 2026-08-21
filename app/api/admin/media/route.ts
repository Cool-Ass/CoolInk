import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage, MediaUploadError } from "@/lib/media";

export async function GET() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ media });
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nie przesłano pliku." }, { status: 400 });
  }

  const alt = (formData?.get("alt") as string) || null;

  try {
    const saved = await saveUploadedImage(file);
    const media = await prisma.media.create({
      data: {
        filename: saved.filename,
        url: saved.url,
        width: saved.width,
        height: saved.height,
        size: saved.size,
        mimeType: saved.mimeType,
        alt,
      },
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    if (err instanceof MediaUploadError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Przesyłanie nie powiodło się." }, { status: 500 });
  }
}
