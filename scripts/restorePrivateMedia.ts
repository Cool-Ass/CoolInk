import { put, get, del } from "@vercel/blob";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export const DRILL_STORE = "3Yn2RpULDWBtDc8W";
export const DRILL_HOST = "3yn2rpuldwbtdc8w.private.blob.vercel-storage.com";
type SavedObject = { provider: string; pathname: string; backupPath: string; sha256: string; size: number; contentType: string | null };
export function mediaRestoreTarget(token: string | undefined, run: string | undefined) {
  if (!token || token.split("_")[3] !== DRILL_STORE || !/^vercel_blob_rw_[A-Za-z0-9]+_[A-Za-z0-9]+$/.test(token) || !/^\d{1,30}$/.test(run || "")) throw new Error("Private isolated media target required");
  return `drill/${run}/`;
}
export function mediaRestoreInventory(input: unknown, root: string) {
  const objects = (input as { objects?: SavedObject[] })?.objects;
  if (!Array.isArray(objects) || !objects.length || objects.length > 100) throw new Error("Invalid media inventory");
  let size = 0; const seen = new Set<string>();
  for (const object of objects) {
    if (!object || !["vercel-blob", "supabase-project-inspirations", "s3"].includes(object.provider) || typeof object.pathname !== "string" || typeof object.backupPath !== "string" || !/^[a-f0-9]{64}$/.test(object.sha256) || !Number.isSafeInteger(object.size) || object.size < 0) throw new Error("Invalid media inventory");
    const path = resolve(root, object.backupPath);
    if (!path.startsWith(root + sep) || seen.has(path)) throw new Error("Unsafe media inventory path");
    seen.add(path); size += object.size;
  }
  if (size > 64 * 1024 * 1024) throw new Error("Free-tier drill byte budget exceeded");
  return objects;
}
export async function restorePrivateMedia() {
  if (process.env.GITHUB_ACTIONS !== "true" || process.env.DRILL_MEDIA_RESTORE !== "1") throw new Error("Approved manual media drill required");
  const token = process.env.DRILL_BLOB_READ_WRITE_TOKEN;
  const prefix = mediaRestoreTarget(token, process.env.GITHUB_RUN_ID);
  const root = resolve("restored/media-backup");
  const inventory = mediaRestoreInventory(JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")), root);
  const restored: Array<SavedObject & { url: string }> = [];
  const uploaded: string[] = [];
  const cleanup = async () => {
    for (const url of uploaded) {
      const target = new URL(url);
      if (target.hostname !== DRILL_HOST || !target.pathname.startsWith("/" + prefix)) throw new Error("Unsafe media cleanup target");
      await del(url, { token, abortSignal: AbortSignal.timeout(30000) });
    }
  };
  try {
    for (const [index, object] of inventory.entries()) {
      const bytes = await readFile(resolve(root, object.backupPath));
      if (bytes.length !== object.size || createHash("sha256").update(bytes).digest("hex") !== object.sha256) throw new Error("Saved media bytes differ");
      const blob = await put(`${prefix}${index}-${object.sha256}`, bytes, { token, access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: object.contentType || "application/octet-stream", abortSignal: AbortSignal.timeout(30000) });
      uploaded.push(blob.url);
      if (new URL(blob.url).hostname !== DRILL_HOST) throw new Error("Wrong private store");
      const received = await get(blob.url, { token, access: "private", useCache: false, abortSignal: AbortSignal.timeout(30000) });
      if (received?.statusCode !== 200 || !received.stream) throw new Error("Restored private object unreadable");
      const actual = Buffer.from(await new Response(received.stream).arrayBuffer());
      if (actual.length !== object.size || createHash("sha256").update(actual).digest("hex") !== object.sha256) throw new Error("Restored media bytes differ");
      const anonymous = await fetch(blob.url, { redirect: "manual", signal: AbortSignal.timeout(10000) });
      if (![401, 403, 404].includes(anonymous.status)) throw new Error("Restored private object publicly readable");
      await anonymous.body?.cancel();
      restored.push({ ...object, url: blob.url });
    }
    return { restored, cleanup };
  } catch { await cleanup(); throw new Error("Private media restore failed; private diagnostics withheld"); }
}
