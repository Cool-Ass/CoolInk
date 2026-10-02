import { googleWorkerIdentity } from "./githubWorkerAuth";

/** Machine authority is verified before the browser CSRF boundary, and again
 * by the handler before replay reservation. No generic cron/Bearer exemption. */
export async function signedGoogleExportMutation(request: Request) {
  if (new URL(request.url).pathname !== "/api/cron/google-exports" || request.method !== "POST"
    || process.env.VERCEL_ENV !== "production"
    || request.headers.has("cookie") || request.headers.has("origin")) return false;
  return Boolean(await googleWorkerIdentity(request));
}
