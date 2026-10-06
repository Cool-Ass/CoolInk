import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const uploads = vi.hoisted(() => ({ buffer: null as Buffer | null }));
vi.mock("../lib/storage", () => ({
  uploadMedia: vi.fn(async (_key: string, buffer: Buffer) => { uploads.buffer = buffer; return "https://example.com/image.webp"; }),
  deleteMedia: vi.fn(), isExternalMediaUrl: vi.fn(),
}));
import { saveUploadedImage } from "../lib/media";

describe("public image transparency", () => {
  it("preserves transparent and semi-transparent PNG pixels through upload conversion", async () => {
    const input = await sharp(Buffer.from([255, 0, 0, 0, 0, 255, 0, 128]), { raw: { width: 2, height: 1, channels: 4 } }).png().toBuffer();
    await saveUploadedImage(new File([input], "overlay.png", { type: "image/png" }));
    const { data, info } = await sharp(uploads.buffer!).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(128);
  });
});
