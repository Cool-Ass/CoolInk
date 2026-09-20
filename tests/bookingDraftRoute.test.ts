import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ client: vi.fn(), origin: vi.fn(), limit: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin, rateLimit: m.limit, tooManyRequests: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { client: { findUnique: m.read, update: m.update } } }));
import { GET, PUT } from "../app/api/client/booking-draft/route";
const draft = { title: "", description: "Pomysł", placement: "", size: "", notes: "", consultationMode: "studio", leadSource: "", styles: [] };
const call = (body: unknown = draft) => PUT(new Request("http://localhost/api/client/booking-draft", { method: "PUT", body: JSON.stringify(body) }));
beforeEach(() => { vi.clearAllMocks(); m.client.mockResolvedValue({ id: "own" }); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: true }); m.read.mockResolvedValue({ bookingDraft: draft }); });
describe("private draft access", () => {
  it("requires a client session", async () => { m.client.mockResolvedValue(null); expect((await GET()).status).toBe(401); expect((await call()).status).toBe(401); });
  it("blocks foreign origins and rate limits writes", async () => { m.origin.mockReturnValue(false); expect((await call()).status).toBe(403); m.origin.mockReturnValue(true); m.limit.mockResolvedValue({ allowed: false }); expect((await call()).status).toBe(429); });
  it("always reads and updates the session owner", async () => { expect((await GET()).headers.get("cache-control")).toBe("private, no-store"); expect((await call({ ...draft, clientId: "foreign" })).status).toBe(200); expect(m.update).toHaveBeenCalledWith({ where: { id: "own" }, data: { bookingDraft: draft } }); });
  it("rejects malformed payloads", async () => { expect((await call({ description: 5 })).status).toBe(400); expect(m.update).not.toHaveBeenCalled(); });
});
