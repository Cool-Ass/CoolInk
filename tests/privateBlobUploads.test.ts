import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ put: vi.fn(), prepare: vi.fn(), create: vi.fn(), find: vi.fn(), noop: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: m.put, get: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({ requireAdminApi: async () => ({ ok: true, admin: { id: "staff" } }) }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: async () => ({ id: "client", supabaseUserId: "auth", firstName: "Test", lastName: "Fixture" }), getClientAccessToken: async () => "fixture", getSupabaseConfig: () => { throw new Error("Public fallback must not be used"); } }));
vi.mock("@/lib/privateImageUpload", () => ({ preparePrivateImage: m.prepare, PrivateImageUploadError: class extends Error {} }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: () => true, rateLimit: async () => ({ allowed: true }), tooManyRequests: vi.fn() }));
vi.mock("@/lib/webPush", () => ({ sendPushToAdmins: async () => {} }));
vi.mock("@/lib/prisma", () => {
  const db = { tattooProject: { findFirst: m.find, findUnique: m.find, update: m.noop }, projectImage: { create: m.create }, projectActivity: { create: m.noop }, clientNotification: { create: m.noop } };
  return { prisma: { ...db, $transaction: async (work: (tx: typeof db) => unknown) => work(db) } };
});
import { POST as adminUpload } from "../app/api/admin/projects/[id]/images/route";
import { POST as clientUpload } from "../app/api/client/projects/[id]/images/route";
import { readChatInput } from "../lib/chatImage";

function request() {
  const form = new FormData();
  form.set("file", new File(["fixture"], "image.webp", { type: "image/webp" }));
  return new Request("https://www.coolinktattoo.pl/api/upload", { method: "POST", body: form });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Public_testonly");
  vi.stubEnv("PRIVATE_BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_Private_testonly");
  vi.stubEnv("SESSION_SECRET", "fixture-signing-key-at-least-32-characters");
  m.prepare.mockResolvedValue({ buffer: Buffer.from("fixture"), extension: "webp", contentType: "image/webp" });
  m.find.mockResolvedValue({ id: "project", clientId: "client", title: "Fixture" });
  m.create.mockResolvedValue({ id: "image", caption: null, createdAt: new Date() });
  m.put.mockResolvedValue({ url: "https://private.private.blob.vercel-storage.com/project-inspirations/fixture.webp" });
});
afterEach(() => vi.unstubAllEnvs());
describe("production private upload credential routing", () => {
  for (const [role, upload] of [["admin", adminUpload], ["client", clientUpload]] as const) {
    it(`routes ${role} project images to the private store with public CMS configured`, async () => {
      expect((await upload(request(), { params: Promise.resolve({ id: "project" }) })).status).toBe(201);
      expect(m.put).toHaveBeenCalledWith(expect.stringMatching(/^project-inspirations\//), expect.any(Buffer), expect.objectContaining({ access: "private", token: "vercel_blob_rw_Private_testonly" }));
    });
  }
  it("routes chat photos to the same separate private store", async () => {
    expect((await readChatInput(request(), "client")).imageUrl).toContain("private.private.blob");
    expect(m.put).toHaveBeenCalledWith(expect.stringMatching(/^project-inspirations\/chat\/client\//), expect.any(Buffer), expect.objectContaining({ access: "private", token: "vercel_blob_rw_Private_testonly" }));
  });
});
