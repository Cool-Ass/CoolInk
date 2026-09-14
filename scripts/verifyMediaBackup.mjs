import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || "media-backup");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
if (!manifest || !Array.isArray(manifest.objects)) throw new Error("Manifest kopii mediów jest nieprawidłowy.");

for (const object of manifest.objects) {
  if (!object || typeof object.backupPath !== "string" || typeof object.sha256 !== "string" || !Number.isSafeInteger(object.size)) {
    throw new Error("Manifest zawiera nieprawidłowy wpis.");
  }
  const target = path.resolve(root, object.backupPath);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error(`Ścieżka wychodzi poza katalog kopii: ${object.backupPath}`);
  const info = await stat(target);
  if (!info.isFile() || info.size !== object.size) throw new Error(`Niezgodny rozmiar kopii: ${object.backupPath}`);
  const data = await readFile(target);
  const digest = createHash("sha256").update(data).digest("hex");
  if (digest !== object.sha256) throw new Error(`Niezgodna suma kontrolna: ${object.backupPath}`);
}

console.log(`PASS: zweryfikowano ${manifest.objects.length} obiektów mediów.`);
