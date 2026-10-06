import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), readFile: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { media: { findFirst: mocks.findFirst } } }));
vi.mock("node:fs/promises", () => ({ default: { readFile: mocks.readFile } }));
import { GET } from "@/app/uploads/[filename]/route";
const filename = "12345678-1234-1234-1234-123456789abc.webp";
const read = (value = filename) => GET(new Request("http://localhost/uploads/test"), { params: Promise.resolve({ filename: value }) });
beforeEach(() => { vi.resetAllMocks(); });
describe("runtime public CMS upload reads", () => {
  it("serves registered re-encoded public images after startup", async () => {
    mocks.findFirst.mockResolvedValue({ id: "media" });
    mocks.readFile.mockResolvedValue(Buffer.from([1, 2, 3]));
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { url: `/uploads/${filename}`, mimeType: "image/webp" }, select: { id: true } });
  });
  it.each(["../secret.webp", "private.jpg", "test.svg", "12345678-1234-1234-1234-123456789abc.webp/extra"])("rejects invalid paths: %s", async value => {
    expect((await read(value)).status).toBe(404);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });
  it("does not read unregistered or private files", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect((await read()).status).toBe(404);
    expect(mocks.readFile).not.toHaveBeenCalled();
  });
  it("returns 404 for deleted local bytes", async () => {
    mocks.findFirst.mockResolvedValue({ id: "media" });
    mocks.readFile.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    expect((await read()).status).toBe(404);
  });
});
