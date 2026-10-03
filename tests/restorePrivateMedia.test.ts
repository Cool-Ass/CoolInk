import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { DRILL_STORE, mediaRestoreInventory, mediaRestoreTarget } from "../scripts/restorePrivateMedia";

describe("private media recovery isolation", () => {
  const token = `vercel_blob_rw_${DRILL_STORE}_testonly`;
  const root = resolve("restored/media-backup");
  const object = { provider: "vercel-blob", pathname: "image.png", backupPath: "objects/1.bin", sha256: "a".repeat(64), size: 10, contentType: "image/png" };
  it("requires the exact isolated store and numeric run prefix", () => {
    expect(mediaRestoreTarget(token, "123")).toBe("drill/123/");
    for (const bad of [undefined, token.replace(DRILL_STORE, "production"), "invalid"]) expect(() => mediaRestoreTarget(bad, "123")).toThrow();
    for (const run of [undefined, "../prod", "", "12/3"]) expect(() => mediaRestoreTarget(token, run)).toThrow();
  });
  it("validates saved paths, hashes, providers and free-tier budget", () => {
    expect(mediaRestoreInventory({ objects: [object] }, root)).toHaveLength(1);
    expect(mediaRestoreInventory({ objects: [{ ...object, provider: "supabase-project-inspirations" }] }, root)).toHaveLength(1);
    for (const change of [{ backupPath: "../outside" }, { provider: "unknown" }, { sha256: "bad" }, { size: -1 }, { size: 65 * 1024 * 1024 }]) {
      expect(() => mediaRestoreInventory({ objects: [{ ...object, ...change }] }, root)).toThrow();
    }
    expect(() => mediaRestoreInventory({ objects: [object, object] }, root)).toThrow();
    expect(() => mediaRestoreInventory({ objects: [] }, root)).toThrow();
  });
  it("blocks provider traffic through both global and SDK-owned fetch", () => {
    const script = `
      require("./scripts/recoveryLocalFetch.cjs");
      (async () => {
        for (const fetcher of [globalThis.fetch, require("undici").fetch]) {
          for (const url of ["https://example.invalid", "https://3yn2rpuldwbtdc8w.private.blob.vercel-storage.com/image"]) {
            try { await fetcher(url, { method: "POST" }); process.exit(2); } catch {}
          }
        }
        process.exit(0);
      })();
    `;
    const result = spawnSync(process.execPath, ["-e", script], {
      cwd: resolve("."), timeout: 10000,
      env: { ...process.env, DRILL_MEDIA_RESTORE: "1", DRILL_BLOB_READ_WRITE_TOKEN: token },
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
  });
});
