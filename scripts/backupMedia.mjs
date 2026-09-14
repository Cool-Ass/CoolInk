import { get, list } from "@vercel/blob";
import { createHash, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve(process.argv[2] || "media-backup");
const manifest = [];
const usedPaths = new Set();
const MAX_OBJECTS = 100_000;
await mkdir(output, { recursive: true });

function safeRelativePath(provider, sourcePath) {
  const segments = sourcePath
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "_") || "_");
  if (!segments.length) throw new Error(`Niebezpieczna ścieżka obiektu: ${sourcePath}`);
  return [provider, ...segments].join("/");
}

async function persist(provider, sourcePath, data, contentType = null) {
  if (manifest.length >= MAX_OBJECTS) throw new Error(`Przekroczono bezpieczny limit ${MAX_OBJECTS} obiektów.`);
  const backupPath = safeRelativePath(provider, sourcePath);
  if (usedPaths.has(backupPath)) throw new Error(`Powtarzająca się ścieżka kopii: ${backupPath}`);
  usedPaths.add(backupPath);
  const target = path.join(output, backupPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  manifest.push({ provider, pathname: sourcePath, backupPath, size: data.length, sha256: createHash("sha256").update(data).digest("hex"), contentType });
}

async function backupVercelBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  let cursor;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const response = await get(blob.url, { access: "private", useCache: false }).catch(() => get(blob.url, { access: "public", useCache: false }).catch(() => null));
      if (!response?.stream) throw new Error(`Nie udało się pobrać obiektu Vercel Blob: ${blob.pathname}`);
      const chunks = [];
      for await (const chunk of response.stream) chunks.push(Buffer.from(chunk));
      await persist("vercel-blob", blob.pathname, Buffer.concat(chunks), blob.contentType || null);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return true;
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Niepełna konfiguracja kopii Supabase Storage.");
  return { url, key };
}

async function backupSupabaseStorage() {
  const config = supabaseConfig();
  if (!config) return false;
  const queue = [""];
  const visited = new Set();
  while (queue.length) {
    const prefix = queue.shift();
    if (visited.has(prefix)) continue;
    visited.add(prefix);
    let offset = 0;
    for (;;) {
      const response = await fetch(`${config.url}/storage/v1/object/list/project-inspirations`, {
        method: "POST",
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!response.ok) throw new Error(`Nie udało się odczytać listy Supabase Storage (${response.status}).`);
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("Nieprawidłowa odpowiedź Supabase Storage.");
      for (const entry of entries) {
        const name = typeof entry?.name === "string" ? entry.name : "";
        if (!name || name === "." || name === ".." || name.includes("/")) throw new Error("Niebezpieczna nazwa obiektu Supabase Storage.");
        const objectPath = prefix ? `${prefix}/${name}` : name;
        if (!entry.id && !entry.metadata) { queue.push(objectPath); continue; }
        const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
        const source = await fetch(`${config.url}/storage/v1/object/authenticated/project-inspirations/${encoded}`, {
          headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
        });
        if (!source.ok) throw new Error(`Nie udało się pobrać obiektu Supabase Storage (${source.status}): ${objectPath}`);
        await persist("supabase-project-inspirations", objectPath, Buffer.from(await source.arrayBuffer()), source.headers.get("content-type"));
      }
      if (entries.length < 1000) break;
      offset += entries.length;
    }
  }
  return true;
}

function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function hmac(key, value) { return createHmac("sha256", key).update(value).digest(); }
function awsEncode(value) { return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`); }
function amzDate(now) { return now.toISOString().replace(/[:-]|\.\d{3}/g, ""); }
function s3SigningKey(secret, date, region) { return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), "s3"), "aws4_request"); }

function s3Config() {
  const values = {
    endpoint: process.env.S3_ENDPOINT?.replace(/\/$/, ""),
    region: process.env.S3_REGION || "auto",
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
  };
  const supplied = Object.entries(values).filter(([name, value]) => name !== "region" && value).length;
  if (!supplied) return null;
  if (!values.endpoint || !values.accessKeyId || !values.secretAccessKey || !values.bucket) throw new Error("Niepełna konfiguracja kopii S3/R2.");
  return values;
}

async function signedS3Get(config, objectKey, query = {}) {
  const suffix = objectKey ? `/${objectKey.split("/").map(awsEncode).join("/")}` : "";
  const url = new URL(`${config.endpoint}/${awsEncode(config.bucket)}${suffix}`);
  for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, value);
  const now = new Date();
  const date = amzDate(now);
  const day = date.slice(0, 8);
  const payloadHash = hash("");
  const headers = { host: url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": date };
  const canonicalHeaders = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${name}:${value}\n`).join("");
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalQuery = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${awsEncode(key)}=${awsEncode(value)}`).join("&");
  const canonicalRequest = ["GET", url.pathname, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${day}/${config.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", date, scope, hash(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", s3SigningKey(config.secretAccessKey, day, config.region)).update(toSign).digest("hex");
  return fetch(url, { headers: { ...headers, Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` } });
}

function decodeXml(value) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

async function backupS3() {
  const config = s3Config();
  if (!config) return false;
  let continuationToken;
  do {
    const listResponse = await signedS3Get(config, "", { "list-type": "2", "max-keys": "1000", ...(continuationToken ? { "continuation-token": continuationToken } : {}) });
    if (!listResponse.ok) throw new Error(`Nie udało się odczytać listy S3/R2 (${listResponse.status}).`);
    const xml = await listResponse.text();
    const keys = [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((match) => decodeXml(match[1])).filter((key) => key && !key.endsWith("/"));
    for (const key of keys) {
      const source = await signedS3Get(config, key);
      if (!source.ok) throw new Error(`Nie udało się pobrać obiektu S3/R2 (${source.status}): ${key}`);
      await persist("s3", key, Buffer.from(await source.arrayBuffer()), source.headers.get("content-type"));
    }
    const next = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
    continuationToken = next ? decodeXml(next) : undefined;
  } while (continuationToken);
  return true;
}

const providers = [];
for (const backup of [backupVercelBlob, backupSupabaseStorage, backupS3]) providers.push(await backup());
if (!providers.some(Boolean)) throw new Error("Brak skonfigurowanego magazynu mediów do wykonania kopii.");
await writeFile(path.join(output, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), objects: manifest }, null, 2));
console.log(`Zapisano ${manifest.length} obiektów z ${providers.filter(Boolean).length} magazynów.`);
