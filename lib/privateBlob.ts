import { get } from "@vercel/blob";

/** Never borrow the public CMS credential for private client objects. */
export function privateBlobToken(location?: string): string | undefined {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) {
    if (location) throw new Error("Prywatny magazyn zdjęć nie jest skonfigurowany.");
    return undefined;
  }
  const store = token.match(/^vercel_blob_rw_([A-Za-z0-9]+)_[A-Za-z0-9]+$/)?.[1];
  if (!store || store === process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3]) throw new Error("Prywatny i publiczny magazyn muszą być rozdzielone.");
  if (location) {
    const target = new URL(location);
    if (target.protocol !== "https:" || target.hostname !== `${store.toLowerCase()}.private.blob.vercel-storage.com` || target.port || target.username || target.password) throw new Error("Nieprawidłowy prywatny magazyn zdjęcia.");
  }
  return token;
}

export async function readPrivateBlob(location: string) {
  return get(location, { access: "private", useCache: false, token: privateBlobToken(location), abortSignal: AbortSignal.timeout(15000) });
}
/** Predictable SDK path (random suffix explicitly disabled), also tracked on timeout. */
export function privateBlobObjectLocation(path: string) {
  const token = privateBlobToken();
  if (!token) throw new Error("Prywatny magazyn zdjęć nie jest skonfigurowany.");
  return `https://${token.split("_")[3].toLowerCase()}.private.blob.vercel-storage.com/${path.split("/").map(encodeURIComponent).join("/")}`;
}
