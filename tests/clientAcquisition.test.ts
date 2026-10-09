import { expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { captureClientLeadSource } from "../lib/clientAcquisition";

it("captures a validated source only while the client has no source", async () => {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const db = { client: { updateMany } } as unknown as Pick<Prisma.TransactionClient, "client">;
  await captureClientLeadSource(db, "client", " Instagram ");
  expect(updateMany).toHaveBeenCalledWith({ where: { id: "client", leadSource: null }, data: { leadSource: "instagram" } });
  updateMany.mockClear();
  await captureClientLeadSource(db, "client", "");
  await captureClientLeadSource(db, "client", "untrusted");
  expect(updateMany).not.toHaveBeenCalled();
});

it("does not replace a source already selected by the admin or another request", async () => {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const db = { client: { updateMany } } as unknown as Pick<Prisma.TransactionClient, "client">;
  await captureClientLeadSource(db, "client", "google");
  expect(updateMany).toHaveBeenCalledOnce();
  expect(updateMany.mock.calls[0][0].where.leadSource).toBeNull();
});
