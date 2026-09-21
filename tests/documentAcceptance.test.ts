import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ client: vi.fn(), origin: vi.fn(), document: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/clientAuth", () => ({ getCurrentClient: m.client }));
vi.mock("@/lib/requestSecurity", () => ({ isSameOrigin: m.origin }));
vi.mock("@/lib/prisma", () => ({ prisma: { studioDocument: { findFirst: m.document }, documentAcceptance: { upsert: m.upsert } } }));
import { POST } from "../app/api/client/documents/[id]/accept/route";
const formFields = JSON.stringify([{ id: "q", label: "Pytanie", type: "text", required: true, options: [] }]);
const call = (body: unknown) => POST(new Request("http://localhost/api/client/documents/doc/accept", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "doc" }) });
beforeEach(() => { vi.clearAllMocks(); m.client.mockResolvedValue({ id: "own" }); m.origin.mockReturnValue(true); m.document.mockResolvedValue({ id: "doc", version: 2, formFields }); });
describe("document acceptance", () => {
  it("rejects a stale version and unanswered required fields", async () => {
    expect((await call({ version: 1, answers: { q: "tak" } })).status).toBe(409);
    expect((await call({ version: 2, answers: {} })).status).toBe(400);
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it("stores validated answers for the current client without overwriting previous acceptance", async () => {
    expect((await call({ clientId: "foreign", version: 2, answers: { q: "tak" } })).status).toBe(200);
    expect(m.upsert).toHaveBeenCalledWith({ where: { clientId_documentId_version: { clientId: "own", documentId: "doc", version: 2 } }, create: { clientId: "own", documentId: "doc", version: 2, answers: '{"q":"tak"}' }, update: {} });
  });
  it("requires authentication and same origin", async () => {
    m.client.mockResolvedValue(null); expect((await call({})).status).toBe(401);
    m.origin.mockReturnValue(false); expect((await call({})).status).toBe(403);
    expect(m.upsert).not.toHaveBeenCalled();
  });
});
