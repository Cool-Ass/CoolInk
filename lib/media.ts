import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { deleteMedia, isExternalMediaUrl, uploadMedia } from "./storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const MAX_DIMENSION = 2400; // longest edge, px — keeps files reasonable

export class MediaUploadError extends Error {}

function maxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB || 8);
  return mb * 1024 * 1024;
}

/** Validates + resizes/optimizes an uploaded image and writes it to /public/uploads. */
export async function saveUploadedImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new MediaUploadError(
      `Nieobsługiwany typ pliku "${file.type}". Użyj JPEG, PNG, WebP lub SVG.`
    );
  }
  if (file.size > maxUploadBytes()) {
    throw new MediaUploadError(
      `Plik jest za duży. Maksymalny rozmiar to ${process.env.MAX_UPLOAD_MB || 8}MB.`
    );
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  const image = sharp(inputBuffer).rotate(); // auto-orient from EXIF
  const meta = await image.metadata();

  const needsResize =
    (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;

  const pipeline = needsResize
    ? image.resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
    : image;

  const outputBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
  const outputMeta = await sharp(outputBuffer).metadata();

  const filename = `${crypto.randomUUID()}.webp`;
  const key = `uploads/${filename}`;
  const externalUrl = await uploadMedia(key, outputBuffer, "image/webp");
  if (!externalUrl) await fs.writeFile(path.join(UPLOAD_DIR, filename), outputBuffer);

  return {
    filename,
    url: externalUrl ?? `/uploads/${filename}`,
    width: outputMeta.width ?? null,
    height: outputMeta.height ?? null,
    size: outputBuffer.byteLength,
    mimeType: "image/webp",
  };
}

/** Deletes an uploaded file from disk, ignoring "already gone" errors. */
export async function deleteUploadedFile(url: string) {
  if (!url.startsWith("/uploads/")) {
    if (!isExternalMediaUrl(url)) return;
    const external = await deleteMedia(`uploads/${url.split("/").pop()}`);
    if (!external) return;
    return;
  }
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
