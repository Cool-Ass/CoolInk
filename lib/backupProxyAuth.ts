import { escrowRecipient } from "./configEscrow";
import { backupWorkflowIdentity } from "./githubBackupAuth";

/** Exact machine-only mutation; authenticate before browser CSRF. The route
 * independently verifies the same recipient and reserves the run. Clone the
 * body; never exempt arbitrary Bearer requests or the whole cron namespace. */
export async function signedBackupMutation(request: Request) {
  if (new URL(request.url).pathname !== "/api/cron/config-escrow" || request.method !== "POST"
    || process.env.VERCEL_ENV !== "production" || process.env.BACKUP_CONFIG_ESCROW_ENABLED !== "1"
    || request.headers.has("cookie") || request.headers.has("origin")
    || !request.headers.get("authorization")?.startsWith("Bearer ")
    || !request.headers.get("content-type")?.startsWith("application/json")
    || Number(request.headers.get("content-length") ?? 0) > 2048) return false;
  const reader = request.clone().body?.getReader();
  if (!reader) return false;
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2048) { void reader.cancel().catch(() => {}); return false; }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !("publicKey" in body)) return false;
    return Boolean(await backupWorkflowIdentity(request, escrowRecipient(body.publicKey).audience));
  } catch { return false; }
  finally { reader.releaseLock(); }
}
