import { NextResponse } from "next/server";
import { escrowRecipient, sealRuntimeConfiguration } from "@/lib/configEscrow";
import { backupWorkflowIdentity } from "@/lib/githubBackupAuth";
import { reserveWebhook } from "@/lib/webhookSecurity";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (status: number, error: string) => NextResponse.json({ error }, { status, headers });

async function recipientBody(request: Request) {
  if (!request.body || !request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Invalid body");
  if (Number(request.headers.get("content-length") ?? 0) > 2048) throw new Error("Invalid body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error("Invalid body"); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !("publicKey" in body)) throw new Error("Invalid body");
    return body.publicKey as unknown;
  } finally { reader.releaseLock(); }
}

export async function POST(request: Request) {
  // Default disabled; no cookie/admin session or browser-origin authority accepted.
  if (process.env.VERCEL_ENV !== "production" || process.env.BACKUP_CONFIG_ESCROW_ENABLED !== "1") return reply(503, "Unavailable");
  if (request.headers.has("cookie") || request.headers.has("origin")) return reply(401, "Unauthorized");
  if (!request.headers.get("authorization")?.startsWith("Bearer ")) return reply(401, "Unauthorized");
  let publicKey: unknown; let audience: string;
  try { publicKey = await recipientBody(request); audience = escrowRecipient(publicKey).audience; }
  catch { return reply(400, "Invalid request"); }
  const run = await backupWorkflowIdentity(request, audience);
  if (!run) return reply(401, "Unauthorized");
  // The verified JWT audience contains the recipient digest: a stolen token cannot
  // substitute an attacker's key. One response per trusted workflow run attempt.
  try {
    const reserved = await reserveWebhook("github-config-escrow", run, request.headers.get("authorization") ?? "");
    if (reserved.duplicate) return reply(409, "Replay rejected");
    const envelope = sealRuntimeConfiguration(publicKey, run);
    await prisma.webhookReceipt.update({ where: { id: reserved.receipt.id }, data: { status: "processed", processedAt: new Date() } });
    return NextResponse.json(envelope, { headers });
  } catch { return reply(503, "Configuration escrow failed"); }
}
