import crypto from "node:crypto";

type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl, region: process.env.S3_REGION || "auto" };
}

function hash(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function amzDate(now: Date) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function signingKey(secret: string, date: string, region: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), "s3"), "aws4_request");
}

async function s3Request(method: "PUT" | "DELETE", key: string, body?: Buffer, contentType?: string) {
  const config = getS3Config();
  if (!config) throw new Error("S3 storage is not configured.");

  const now = new Date();
  const date = amzDate(now);
  const day = date.slice(0, 8);
  const url = new URL(`${config.endpoint}/${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`);
  const payloadHash = hash(body ?? "");
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": date,
  };
  if (contentType) headers["content-type"] = contentType;
  const sorted = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
  const canonicalHeaders = sorted.map(([name, value]) => `${name}:${value}\n`).join("");
  const signedHeaders = sorted.map(([name]) => name).join(";");
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${day}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", date, scope, hash(canonicalRequest)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(config.secretAccessKey, day, config.region)).update(stringToSign).digest("hex");

  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: body ? new Uint8Array(body) : undefined,
  });
  if (!response.ok) throw new Error(`Storage request failed (${response.status}).`);
}

export function usesExternalStorage() {
  return getS3Config() !== null;
}

export function isExternalMediaUrl(url: string) {
  const config = getS3Config();
  return Boolean(config && url.startsWith(`${config.publicUrl}/uploads/`));
}

export async function uploadMedia(key: string, data: Buffer, contentType: string) {
  const config = getS3Config();
  if (!config) return null;
  await s3Request("PUT", key, data, contentType);
  return `${config.publicUrl}/${key}`;
}

export async function deleteMedia(key: string) {
  if (!getS3Config()) return false;
  await s3Request("DELETE", key);
  return true;
}
