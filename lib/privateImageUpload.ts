import sharp from "sharp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 2400;
const MAX_INPUT_PIXELS = 40_000_000;

function maxUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_MB ?? "8");
  const megabytes = Number.isFinite(configured) ? Math.min(Math.max(configured, 1), 20) : 8;
  return { bytes: megabytes * 1024 * 1024, megabytes };
}

export class PrivateImageUploadError extends Error {}

/**
 * Decodes an untrusted upload and writes a fresh WebP file. This validates the
 * actual image payload (rather than trusting Content-Type), removes metadata
 * and bounds the dimensions before it reaches private object storage.
 */
export async function preparePrivateImage(file: File) {
  const limit = maxUploadBytes();
  if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > limit.bytes) {
    throw new PrivateImageUploadError(`Dodaj prawidłowy JPG, PNG albo WEBP o rozmiarze do ${limit.megabytes} MB.`);
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const output = await sharp(input, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS })
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
