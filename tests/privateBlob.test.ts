import { afterEach, describe, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@vercel/blob", () => ({ get: calls.get }));
import { privateBlobToken, readPrivateBlob } from "../lib/privateBlob";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("separate private Blob credentials", () => {
  it("never falls back to the public CMS credential", () => {
    vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Public_testonly");
    expect(privateBlobToken()).toBeUndefined();
    expect(() => privateBlobToken("https://public.public.blob.vercel-storage.com/image")).toThrow();
  });
  it("rejects shared, invalid or foreign store credentials before network access", async () => {
    vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Private_testonly");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Public_testonly");
    for (const location of ["https://public.public.blob.vercel-storage.com/image", "https://foreign.private.blob.vercel-storage.com/image", "http://private.private.blob.vercel-storage.com/image", "https://private.private.blob.vercel-storage.com:444/image", "https://user@private.private.blob.vercel-storage.com/image"]) {
      await expect(readPrivateBlob(location)).rejects.toThrow();
    }
    expect(calls.get).not.toHaveBeenCalled();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Private_other");
    expect(() => privateBlobToken()).toThrow();
    vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", "invalid");
    expect(() => privateBlobToken()).toThrow();
  });
  it("uses only the matching private credential and a bounded uncached read", async () => {
    const token = "vercel_blob_rw_Private_testonly";
    vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", token);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Public_testonly");
    const location = "https://private.private.blob.vercel-storage.com/image.webp";
    calls.get.mockResolvedValue({ statusCode: 200 });
    await readPrivateBlob(location);
    expect(calls.get).toHaveBeenCalledWith(location, expect.objectContaining({ token, access: "private", useCache: false, abortSignal: expect.any(AbortSignal) }));
  });
});
