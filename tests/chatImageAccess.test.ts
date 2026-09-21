import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ client: vi.fn(), token: vi.fn(), find: vi.fn(), stream: vi.fn() }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/privateMedia", () => ({ verifyPrivateImageToken: m.token }));
vi.mock("@/lib/chatImage", () => ({ streamChatImage: m.stream }));
vi.mock("@/lib/prisma", () => ({ prisma: { directMessage: { findFirst: m.find } } }));
import { GET } from "../app/api/client/chat-images/[id]/route";
const call = () => GET(new Request("http://localhost/api/client/chat-images/photo"), { params: Promise.resolve({ id: "photo" }) });
beforeEach(() => { vi.clearAllMocks(); m.client.mockResolvedValue({ id: "own" }); m.token.mockReturnValue(true); m.find.mockResolvedValue(null); });
describe("private direct chat images", () => {
  it("limits lookups to the signed-in owner", async () => {
    expect((await call()).status).toBe(404);
    expect(m.find).toHaveBeenCalledWith({ where: { id: "photo", clientId: "own" }, select: { imageUrl: true } });
    expect(m.stream).not.toHaveBeenCalled();
  });
  it("rejects anonymous access and invalid signatures before looking up media", async () => {
    m.client.mockResolvedValue(null); expect((await call()).status).toBe(401);
    m.client.mockResolvedValue({ id: "own" }); m.token.mockReturnValue(false); expect((await call()).status).toBe(403);
    expect(m.find).not.toHaveBeenCalled();
  });
  it("streams an owned attachment only after authorization", async () => {
    m.find.mockResolvedValue({ imageUrl: "private-location" }); m.stream.mockResolvedValue(new Response("image"));
    expect((await call()).status).toBe(200); expect(m.stream).toHaveBeenCalledWith("private-location");
  });
});
