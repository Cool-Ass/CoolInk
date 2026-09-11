import sharp from "sharp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_DIMENSION = 2400;

export class PrivateImageUploadError extends Error {}

/**
 * Decodes an untrusted upload and writes a fresh WebP file. This validates the
 * actual image payload (rather than trusting Content-Type), removes metadata
 * and bounds the dimensions before it reaches private object storage.
 */
export async function preparePrivateImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) {
    throw new PrivateImageUploadError("Dodaj prawidłowy JPG, PNG albo WEBP o rozmiarze do 10 MB.");
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input, { failOn: "warning" })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, alphaQuality: 90 })
      .toBuffer();
    const metadata = await sharp(output).metadata();
    if (!metadata.width || !metadata.height) throw new Error("Missing image dimensions");
    return { buffer: output, contentType: "image/webp" as const, extension: "webp" as const };
  } catch {
    throw new PrivateImageUploadError("Plik nie zawiera prawidłowego obrazu JPG, PNG ani WEBP.");
  }
}
