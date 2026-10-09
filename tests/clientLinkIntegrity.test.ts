import { expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ update: vi.fn(), notify: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  accountDeletionRequest: { findUnique: async () => null },
  client: { findUnique: async ({ where }: { where: { email?: string } }) => where.email ? { id: "client", email: where.email, supabaseUserId: null, firstName: "Test", lastName: "Client" } : null },
  $transaction: (run: (tx: unknown) => unknown) => run({ client: { update: m.update }, contactMessage: { create: m.notify } }),
} }));
import { linkAuthenticatedClient } from "../lib/clientAuth";
it("does not link or notify when the CRM identity changed before the write", async () => {
  m.update.mockRejectedValue(new Error("Concurrent identity edit"));
  await expect(linkAuthenticatedClient({ id: "auth", email: "old@example.com", email_confirmed_at: "2026-09-30" })).rejects.toThrow("Concurrent identity edit");
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "client", email: "old@example.com", AND: { supabaseUserId: null } } }));
  expect(m.notify).not.toHaveBeenCalled();
});
