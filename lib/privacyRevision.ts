import { createHash } from "node:crypto";
export function privacyRevision(row: { status: string; note: string | null; resolvedAt: Date | null }) {
  return createHash("sha256").update(JSON.stringify([row.status, row.note, row.resolvedAt?.toISOString() ?? null])).digest("hex");
}
