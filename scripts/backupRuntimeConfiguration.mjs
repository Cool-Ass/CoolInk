import { constants, createDecipheriv, createHash, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const endpoint = "https://www.coolinktattoo.pl/api/cron/config-escrow";
const allowed = new Set(["SESSION_SECRET", "MFA_ENCRYPTION_KEY", "PRIVATE_MEDIA_SIGNING_KEY", "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEYS", "GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY", "GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "GOOGLE_CALENDAR_REDIRECT_URI", "VAPID_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_SUBJECT"]);

export function verifyConfigurationEnvelope(envelope, privateKey, expectedRun) {
  const context = envelope?.context;
  if (!context || context.version !== 1 || context.purpose !== "coolink-runtime-key-recovery" || context.run !== expectedRun || envelope.algorithm !== "RSA-OAEP-SHA256+A256GCM") throw new Error("Invalid configuration archive");
  const key = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(envelope.wrappedKey, "base64"));
  let plaintext;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
    decipher.setAAD(Buffer.from(JSON.stringify(context)));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
    const { values } = JSON.parse(plaintext.toString());
    if (!values || typeof values.SESSION_SECRET !== "string" || values.SESSION_SECRET.length < 32) throw new Error("Incomplete configuration archive");
    for (const [name, value] of Object.entries(values)) if (!allowed.has(name) || typeof value !== "string" || Buffer.byteLength(value) > 8192) throw new Error("Invalid configuration archive");
    // Metadata only: decrypted values never leave this verifier or reach stdout.
    return { version: 1, run: context.run, createdAt: context.createdAt, keys: Object.keys(values).sort(), verified: true };
  } finally { key.fill(0); plaintext?.fill(0); }
}

async function boundedJson(response) {
  if (!response.ok || !response.body) throw new Error("Configuration service unavailable");
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 262144) { await reader.cancel(); throw new Error("Invalid configuration response"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  } finally { reader.releaseLock(); }
}

async function capture(directory) {
  const run = `${process.env.GITHUB_RUN_ID}:${process.env.GITHUB_RUN_ATTEMPT}`;
  if (process.env.GITHUB_REPOSITORY !== "Cool-Ass/CoolInk" || process.env.GITHUB_REF !== "refs/heads/main" || !/^\d{1,30}:\d{1,10}$/.test(run)) throw new Error("Untrusted backup context");
  const pair = generateKeyPairSync("rsa", { modulusLength: 3072 });
  const der = pair.publicKey.export({ format: "der", type: "spki" });
  const recipient = createHash("sha256").update(der).digest("hex");
  const tokenUrl = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  tokenUrl.searchParams.set("audience", `${endpoint}?recipient=${recipient}`);
  const identity = await boundedJson(await fetch(tokenUrl, { headers: { authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }, signal: AbortSignal.timeout(15000), redirect: "error" }));
  if (typeof identity.value !== "string" || identity.value.length > 10000) throw new Error("Backup identity unavailable");
  console.log("::add-mask::" + identity.value);
  const envelope = await boundedJson(await fetch(endpoint, {
    method: "POST", headers: { authorization: `Bearer ${identity.value}`, "content-type": "application/json" },
    body: JSON.stringify({ publicKey: der.toString("base64") }), signal: AbortSignal.timeout(30000), redirect: "error",
  }));
  if (envelope.context?.recipient !== recipient) throw new Error("Configuration recipient mismatch");
  const privateKey = pair.privateKey.export({ format: "pem", type: "pkcs8" });
  const manifest = verifyConfigurationEnvelope(envelope, privateKey, run);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  // These files may only be uploaded inside the password-encrypted backup archive.
  await writeFile(resolve(directory, "recipient-private.pem"), privateKey, { mode: 0o600 });
  await writeFile(resolve(directory, "sealed.json"), JSON.stringify(envelope), { mode: 0o600 });
  await writeFile(resolve(directory, "manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
  console.log("Runtime configuration sealed and locally verified; no rotation performed");
}

async function verify(directory) {
  const envelope = JSON.parse(await readFile(resolve(directory, "sealed.json"), "utf8"));
  const privateKey = await readFile(resolve(directory, "recipient-private.pem"), "utf8");
  const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
  const actual = verifyConfigurationEnvelope(envelope, privateKey, manifest.run);
  if (JSON.stringify(actual) !== JSON.stringify(manifest)) throw new Error("Configuration manifest mismatch");
  console.log("Runtime configuration envelope verified offline; runtime login proof remains separate");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, directory] = process.argv.slice(2);
  const operation = mode === "capture" ? capture : mode === "verify" ? verify : null;
  if (!operation || !directory) { console.error("Configuration backup requires capture/verify and a private directory"); process.exitCode = 1; }
  else await operation(resolve(directory)).catch(() => { console.error("Configuration backup failed (private details suppressed)"); process.exitCode = 1; });
}
