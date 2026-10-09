import { expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { getClientRegistrationStats } from "../lib/clientRegistrationStats";

it("queries only aggregate counts, with bound dates and no registration dependency on CRM", async () => {
  const counts = { total: 4, withoutProject: 2, withoutAppointment: 3 };
  const query = vi.fn().mockResolvedValue([counts]);
  const db = { $queryRaw: query } as unknown as Pick<Prisma.TransactionClient, "$queryRaw">;
  const from = new Date("2026-10-01"), to = new Date("2026-10-09");
  expect(await getClientRegistrationStats(db, from, to)).toEqual(counts);
  const [strings, ...values] = query.mock.calls[0];
  expect(values).toEqual([from, to]);
  expect(strings.join("")).toContain("LEFT JOIN");
  expect(strings.join("")).toContain("FROM auth.users");
  expect(strings.join("")).not.toContain("SELECT account.*");
});

it("returns zero counts for an empty aggregate response", async () => {
  const db = { $queryRaw: vi.fn().mockResolvedValue([]) } as unknown as Pick<Prisma.TransactionClient, "$queryRaw">;
  expect(await getClientRegistrationStats(db, new Date(0), new Date())).toEqual({ total: 0, withoutProject: 0, withoutAppointment: 0 });
});
