import { createHmac, timingSafeEqual } from "node:crypto";
import { del as deleteBlob } from "@vercel/blob";

type Audience = "admin" | "client";

function signingKey() {
  const value = process.env.PRIVATE_MEDIA_SIGNING_KEY || process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Brak PRIVATE_MEDIA_SIGNING_KEY lub SESSION_SECRET.");
  return value;
}

function signature(id: string, audience: Audience, subject: string, expires: number) {
  return createHmac("sha256", signingKey()).update(`${id}.${audience}.${subject}.${expires}`).digest("base64url");
}

export function privateImageUrl(id: string, audience: Audience, subject: string, ttlSeconds = 300) {
  const expires = Math.floor(Date.now() / 1000) + Math.min(900, Math.max(30, ttlSeconds));
  const token = `${expires}.${signature(id, audience, subject, expires)}`;
  return `/api/${audience}/images/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
}

export function verifyPrivateImageToken(request: Request, id: string, audience: Audience, subject: string) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const [expiresValue, supplied] = token.split(".");
  const expires = Number(expiresValue);
  if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + 900 || !supplied) return false;
  const expected = Buffer.from(signature(id, audience, subject, expires));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isPrivateBlobLocation(value: string) {
  try { return new URL(value).hostname.endsWith(".blob.vercel-storage.com"); }
  catch { return false; }
}

function safeLegacyObjectPath(value: string) {
  if (!value || value.length > 1_024 || value.startsWith("/") || value.includes("\\")) return null;
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return segments.map(encodeURIComponent).join("/");
}

/** Removes private inspiration objects from both the current and legacy stores. */
export async function deletePrivateProjectMedia(locations: string[]) {
  const unique = [...new Set(locations.filter(Boolean))];
  const failures: string[] = [];
  const blobLocations = unique.filter(isPrivateBlobLocation);
  const legacyLocations = unique.filter((location) => !isPrivateBlobLocation(location));

  if (blobLocations.length) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) failures.push(...blobLocations);
    else {
      const results = await Promise.allSettled(blobLocations.map((location) => deleteBlob(location)));
      results.forEach((result, index) => { if (result.status === "rejected") failures.push(blobLocations[index]); });
    }
  }

  if (legacyLocations.length) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) failures.push(...legacyLocations);
    else {
      const results = await Promise.all(legacyLocations.map(async (location) => {
        const path = safeLegacyObjectPath(location);
        if (!path) return false;
        const response = await fetch(`${url}/storage/v1/object/project-inspirations/${path}`, {
          method: "DELETE",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: "no-store",
        }).catch(() => null);
        return Boolean(response && (response.ok || response.status === 404));
      }));
      results.forEach((deleted, index) => { if (!deleted) failures.push(legacyLocations[index]); });
    }
  }

  return { deleted: unique.length - failures.length, failures };
}
