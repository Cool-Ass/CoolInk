import type { PrismaClient } from "@prisma/client";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { createMfaSecret, decryptMfaSecret, encryptMfaSecret, totpCode } from "../lib/adminMfa";
import { recoveryAuthGateway } from "./recoveryAuthGateway";
import { restorePrivateMedia } from "./restorePrivateMedia";
import { privateImageUrl } from "../lib/privateMedia";

const database = "postgresql://postgres:restore-test@127.0.0.1:5432/coolink_restore";
const origin = "http://127.0.0.1:3217";
export async function verifyRestoredAdminHttp(prisma: PrismaClient, clientFixture?: { id: string; email: string; password: string }) {
  if (process.env.GITHUB_ACTIONS !== "true" || !/^\d{1,30}$/.test(process.env.GITHUB_RUN_ID ?? "")) throw new Error("Disposable runner required");
  const [{ name }] = await prisma.$queryRawUnsafe<Array<{ name: string }>>("SELECT current_database() AS name");
  if (name !== "coolink_restore") throw new Error("Wrong restore target");
  const material = await prisma.adminUser.findFirst({ where: { mfaSecretEncrypted: { not: null } }, select: { mfaSecretEncrypted: true, mfaEnabled: true } });
  const encrypted = material?.mfaSecretEncrypted || encryptMfaSecret(createMfaSecret());
  const seed = decryptMfaSecret(encrypted);
  const password = randomBytes(32).toString("base64url");
  // Clone only the restored MFA ciphertext into an ephemeral local fixture.
  // No existing user's password, address, or record is changed.
  const fixture = await prisma.adminUser.create({ data: { email: `drill-${randomBytes(12).toString("hex")}@example.invalid`, name: "Recovery fixture", role: "owner", passwordHash: await bcrypt.hash(password, 12), mfaEnabled: true, mfaSecretEncrypted: encrypted } });
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "production", DATABASE_URL: database, DATABASE_DIRECT_URL: database, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9998", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "offline-unused", NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--require=${resolve("scripts/recoveryLocalFetch.cjs")}` };
  // Restored provider credentials are checked cryptographically elsewhere;
  // the HTTP drill must never send notifications or call their real providers.
  for (const key of Object.keys(env)) if (/^(GOOGLE_|VAPID_|S3_|BLOB_|PRIVATE_BLOB_|SUPABASE_SERVICE_ROLE_KEY|BACKUP_ENCRYPTION_PASSWORD|VERCEL_|CRON_SECRET)/.test(key)) delete env[key as keyof typeof env];
  const next = resolve("node_modules/next/dist/bin/next");
  let server: ReturnType<typeof spawn> | undefined;
  let stopGateway: (() => Promise<void>) | undefined;
  let media: Awaited<ReturnType<typeof restorePrivateMedia>> | undefined;
  let otherClientId: string | undefined;
  let remappedImages = 0;
  let remappedChatImages = 0;
  let stage = "offline-build";
  try {
    if (process.env.DRILL_MEDIA_RESTORE === "1") {
      stage = "private-media-restore";
      media = await restorePrivateMedia();
      env.PRIVATE_BLOB_READ_WRITE_TOKEN = process.env.DRILL_BLOB_READ_WRITE_TOKEN;
      // Repoint only the disposable restored DB, never the source DB/store.
      const images = await prisma.projectImage.findMany({ select: { id: true, url: true } });
      for (const image of images) {
        const source = media.restored.find(object => {
          if (object.provider.startsWith("vercel-blob")) { try { return decodeURIComponent(new URL(image.url).pathname.slice(1)) === object.pathname; } catch { return false; } }
          return image.url === object.pathname;
        });
        if (!source) throw new Error("Restored media reference has no saved bytes");
        await prisma.projectImage.update({ where: { id: image.id }, data: { url: source.url } });
        remappedImages++;
      }
      const chats = await prisma.directMessage.findMany({ where: { imageUrl: { not: null } }, select: { id: true, imageUrl: true } });
      for (const message of chats) {
        const source = media.restored.find(object => {
          if (object.provider.startsWith("vercel-blob")) { try { return decodeURIComponent(new URL(message.imageUrl!).pathname.slice(1)) === object.pathname; } catch { return false; } }
          return message.imageUrl === object.pathname;
        });
        if (!source) throw new Error("Restored chat media has no saved bytes");
        await prisma.directMessage.update({ where: { id: message.id }, data: { imageUrl: source.url } });
        remappedChatImages++;
      }
    }
    if (clientFixture) stopGateway = await recoveryAuthGateway();
    const build = spawnSync(process.execPath, [next, "build"], { env, stdio: "ignore", timeout: 240000 });
    if (build.status !== 0) throw new Error("Offline application build failed");
    stage = "offline-server-start";
    const runningServer = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "3217"], { env, stdio: "ignore" });
    server = runningServer;
    const call = (path: string, init: RequestInit = {}) => fetch(origin + path, { ...init, redirect: "manual", signal: AbortSignal.timeout(10000) });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (runningServer.exitCode !== null) throw new Error("Offline server exited");
      try { if ((await call("/api/admin/mfa")).status === 401) { ready = true; break; } } catch { /* bounded startup */ }
      await new Promise(done => setTimeout(done, 500));
    }
    if (!ready) throw new Error("Offline server did not start");
    const login = (mfaCode?: string, requestOrigin = origin) => call("/api/admin/login", { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify({ email: fixture.email, password, mfaCode }) });
    stage = "mfa-boundary";
    if ((await login(undefined, "https://example.invalid")).status !== 403 || (await login()).status !== 428 || (await login("invalid-code")).status !== 401) throw new Error("Restored MFA boundary failed");
    stage = "mfa-login";
    const authenticated = await login(totpCode(seed));
    const cookie = authenticated.headers.get("set-cookie")?.match(/coolink_admin_session=([^;]+)/)?.[0];
    if (authenticated.status !== 200 || !cookie) throw new Error("Restored MFA login failed");
    stage = "authenticated-session";
    if ((await call("/api/admin/mfa", { headers: { cookie } })).status !== 200) throw new Error("Restored session not usable");
    stage = "session-revocation";
    await prisma.adminUser.update({ where: { id: fixture.id }, data: { sessionVersion: { increment: 1 } } });
    if ((await call("/api/admin/mfa", { headers: { cookie } })).status !== 401) throw new Error("Restored session revocation failed");
    if (clientFixture) {
      stage = "client-login-boundary";
      const clientLogin = (password = clientFixture.password, requestOrigin = origin) => call("/api/client/auth/login", { method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify({ email: clientFixture.email, password }) });
      if ((await clientLogin(undefined, "https://example.invalid")).status !== 403 || (await clientLogin("incorrect-password")).status !== 401) throw new Error("Restored client login boundary failed");
      stage = "client-application-login";
      const session = await clientLogin();
      const clientCookie = session.headers.get("set-cookie")?.match(/coolink_client_access=([^;]+)/)?.[0];
      if (session.status !== 200 || !clientCookie) throw new Error("Restored client application login failed");
      const linked = await prisma.client.findUnique({ where: { supabaseUserId: clientFixture.id } });
      if (!linked || linked.email !== clientFixture.email) throw new Error("Restored client linking failed");
      stage = "client-authenticated-access";
      if ((await call("/api/client/notifications", { headers: { cookie: clientCookie } })).status !== 200
        || (await call("/api/client/notifications")).status !== 401
        || (await call("/api/admin/mfa", { headers: { cookie: clientCookie } })).status !== 401) throw new Error("Restored client ownership boundary failed");
      if (media) {
        stage = "restored-private-media-http";
        const object = media.restored[0];
        const project = await prisma.tattooProject.create({ data: { clientId: linked.id, title: "Recovery media fixture", description: "Isolated restored-byte access proof" } });
        const image = await prisma.projectImage.create({ data: { projectId: project.id, url: object.url } });
        const url = privateImageUrl(image.id, "client", linked.id);
        const own = await call(url, { headers: { cookie: clientCookie } });
        if (own.status !== 200 || createHash("sha256").update(Buffer.from(await own.arrayBuffer())).digest("hex") !== object.sha256) throw new Error("Restored owner media serving failed");
        if ((await call(url)).status !== 401 || (await call(url.replace("token=", "token=invalid"), { headers: { cookie: clientCookie } })).status !== 403) throw new Error("Restored media authentication boundary failed");
        const other = await prisma.client.create({ data: { email: `other-${randomBytes(12).toString("hex")}@example.invalid`, firstName: "Recovery", lastName: "Other" } });
        otherClientId = other.id;
        const foreignProject = await prisma.tattooProject.create({ data: { clientId: other.id, title: "Other recovery fixture", description: "Isolated ownership denial proof" } });
        const foreignImage = await prisma.projectImage.create({ data: { projectId: foreignProject.id, url: object.url } });
        if ((await call(privateImageUrl(foreignImage.id, "client", linked.id), { headers: { cookie: clientCookie } })).status !== 404) throw new Error("Restored media IDOR boundary failed");
        const reauthenticated = await login(totpCode(seed));
        const adminCookie = reauthenticated.headers.get("set-cookie")?.match(/coolink_admin_session=([^;]+)/)?.[0];
        if (!adminCookie) throw new Error("Restored admin media authentication failed");
        const staff = await call(privateImageUrl(image.id, "admin", fixture.id), { headers: { cookie: adminCookie } });
        if (staff.status !== 200 || createHash("sha256").update(Buffer.from(await staff.arrayBuffer())).digest("hex") !== object.sha256) throw new Error("Restored staff media serving failed");
        stage = "restored-private-chat-http";
        const chat = await prisma.directMessage.create({ data: { clientId: linked.id, author: "admin", body: "Recovery fixture", imageUrl: object.url } });
        const chatUrl = privateImageUrl(chat.id, "client", linked.id).replace("/images/", "/chat-images/");
        const chatOwn = await call(chatUrl, { headers: { cookie: clientCookie } });
        if (chatOwn.status !== 200 || createHash("sha256").update(Buffer.from(await chatOwn.arrayBuffer())).digest("hex") !== object.sha256) throw new Error("Restored chat owner serving failed");
        if ((await call(chatUrl)).status !== 401 || (await call(chatUrl.replace("token=", "token=invalid"), { headers: { cookie: clientCookie } })).status !== 403) throw new Error("Restored chat authentication boundary failed");
        const foreignChat = await prisma.directMessage.create({ data: { clientId: other.id, author: "admin", body: "Other fixture", imageUrl: object.url } });
        if ((await call(privateImageUrl(foreignChat.id, "client", linked.id).replace("/images/", "/chat-images/"), { headers: { cookie: clientCookie } })).status !== 404) throw new Error("Restored chat IDOR boundary failed");
        const chatStaff = await call(privateImageUrl(chat.id, "admin", fixture.id).replace("/images/", "/chat-images/"), { headers: { cookie: adminCookie } });
        if (chatStaff.status !== 200 || createHash("sha256").update(Buffer.from(await chatStaff.arrayBuffer())).digest("hex") !== object.sha256) throw new Error("Restored staff chat serving failed");
      }
      stage = "client-logout";
      const logout = await call("/api/client/auth/logout", { method: "POST", headers: { origin, cookie: clientCookie } });
      if (logout.status !== 200 || !logout.headers.get("set-cookie")?.includes("Max-Age=0")) throw new Error("Restored client logout failed");
    }
    return { productionHttpLogin: true, clientApplicationHttpLogin: Boolean(clientFixture), restoredPrivateObjects: media?.restored.length ?? 0, remappedImages, remappedChatImages, privateMediaHttpServing: Boolean(media && clientFixture), privateChatHttpServing: Boolean(media && clientFixture), mfaChallengeAndRejection: true, sessionRevocation: true, restoredMfaCiphertextUsed: Boolean(material?.mfaSecretEncrypted), sourceMfaEnabled: Boolean(material?.mfaEnabled), fixtureOnlyMfa: !material?.mfaSecretEncrypted };
  } catch {
    console.error("RESTORED_ADMIN_HTTP_FAILED_STAGE", stage);
    throw new Error("Restored admin HTTP verification failed");
  } finally {
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([new Promise(done => server!.once("exit", done)), new Promise(done => setTimeout(done, 5000))]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
    try {
    await prisma.adminUser.delete({ where: { id: fixture.id } });
    if (stopGateway) await stopGateway();
    if (clientFixture) {
      // Only the exact newly created offline Auth fixture may be cleaned up.
      await prisma.client.deleteMany({ where: { supabaseUserId: clientFixture.id, email: clientFixture.email } });
      await prisma.contactMessage.deleteMany({ where: { email: clientFixture.email } });
    }
    if (otherClientId) await prisma.client.delete({ where: { id: otherClientId } });
    } finally {
      if (media) await media.cleanup();
    }
  }
}
