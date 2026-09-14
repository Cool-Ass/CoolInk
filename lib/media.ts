import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import type { Metadata } from "sharp";
import { deleteMedia, isExternalMediaUrl, uploadMedia } from "./storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
const MAX_DIMENSION = 2400; // longest edge, px — keeps files reasonable
const MAX_INPUT_PIXELS = 40_000_000;

export class MediaUploadError extends Error {}

function maxUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_MB || 8);
  const mb = Number.isFinite(configured) ? Math.min(Math.max(configured, 1), 20) : 8;
  return mb * 1024 * 1024;
}

/** Validates + resizes/optimizes an uploaded image and writes it to /public/uploads. */
export async function saveUploadedImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new MediaUploadError(
      `Nieobsługiwany typ pliku "${file.type}". Użyj JPEG, PNG, WebP lub SVG.`
    );
  }
  if (file.size <= 0 || file.size > maxUploadBytes()) {
    throw new MediaUploadError(
      `Plik jest za duży. Maksymalny rozmiar to ${process.env.MAX_UPLOAD_MB || 8}MB.`
    );
  }

  let outputBuffer: Buffer;
  let outputMeta: Metadata;
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(inputBuffer, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    const meta = await image.metadata();
    if (!meta.width || !meta.height) throw new Error("Missing image dimensions");
    const needsResize = meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION;
    const pipeline = needsResize
      ? image.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      : image;
    outputBuffer = await pipeline.webp({ quality: 82, alphaQuality: 90 }).toBuffer();
    outputMeta = await sharp(outputBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new MediaUploadError("Plik nie zawiera bezpiecznego obrazu JPEG, PNG, WebP ani SVG.");
  }

  const filename = `${crypto.randomUUID()}.webp`;
  const key = `uploads/${filename}`;
  const externalUrl = await uploadMedia(key, outputBuffer, "image/webp");
  if (!externalUrl && process.env.VERCEL) {
    throw new MediaUploadError("Trwały magazyn zdjęć nie jest jeszcze skonfigurowany. Dodaj ustawienia S3/R2 przed przesłaniem pliku.");
  }
  if (!externalUrl) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), outputBuffer);
  }

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
    const external = await deleteMedia(url);
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
