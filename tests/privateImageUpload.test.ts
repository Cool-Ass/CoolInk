import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { preparePrivateImage, PrivateImageUploadError } from "../lib/privateImageUpload";

describe("preparePrivateImage", () => {
  it("decodes and rewrites a real image as bounded WebP", async () => {
    const source = await sharp({
      create: { width: 12, height: 8, channels: 4, background: { r: 20, g: 40, b: 60, alpha: 0.5 } },
    }).png().toBuffer();
    const result = await preparePrivateImage(new File([source], "inspiration.png", { type: "image/png" }));
    const metadata = await sharp(result.buffer).metadata();
    expect(result.contentType).toBe("image/webp");
    expect(result.extension).toBe("webp");
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(12);
    expect(metadata.height).toBe(8);
  });

  it("rejects spoofed image payloads", async () => {
    await expect(preparePrivateImage(new File(["not an image"], "fake.png", { type: "image/png" })))
      .rejects.toBeInstanceOf(PrivateImageUploadError);
  });
});
