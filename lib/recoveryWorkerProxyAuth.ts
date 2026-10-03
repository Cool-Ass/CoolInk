import { recoveryWorkerIdentity } from "./githubWorkerAuth";

/** Exact, independently verified machine request, never a cron namespace bypass. */
export async function signedRecoveryMutation(request: Request) {
  if (new URL(request.url).pathname !== "/api/cron/recovery-health" || request.method !== "POST"
    || process.env.VERCEL_ENV !== "production"
    || request.headers.has("cookie") || request.headers.has("origin")) return false;
  return Boolean(await recoveryWorkerIdentity(request));
}
