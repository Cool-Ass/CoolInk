import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export const GOOGLE_WORKER_AUDIENCE = "https://www.coolinktattoo.pl/api/cron/google-exports";
const keys = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"), { timeoutDuration: 5000 });

export const RECOVERY_WORKER_AUDIENCE = "https://www.coolinktattoo.pl/api/cron/recovery-health";
function trustedWorkerClaims(payload: JWTPayload, workflow: string, events: string[]) {
  return payload.repository_id === "1341372006" && payload.repository_owner_id === "319302461"
    && payload.repository === "Cool-Ass/CoolInk" && payload.ref === "refs/heads/main"
    && payload.workflow_ref === `Cool-Ass/CoolInk/.github/workflows/${workflow}@refs/heads/main`
    && events.includes(String(payload.event_name))
    && payload.runner_environment === "github-hosted"
    && /^\d{1,30}$/.test(String(payload.run_id)) && /^\d{1,10}$/.test(String(payload.run_attempt))
    && typeof payload.jti === "string" && payload.jti.length > 0 && payload.jti.length <= 200;
}
export function trustedGoogleWorkerClaims(payload: JWTPayload) {
  return trustedWorkerClaims(payload, "google-export-worker.yml", ["schedule", "workflow_dispatch"]);
}
export function trustedRecoveryWorkerClaims(payload: JWTPayload) {
  return trustedWorkerClaims(payload, "recovery-health.yml", ["schedule", "workflow_dispatch", "workflow_run"]);
}

async function workerIdentity(request: Request, audience: string, trusted: (payload: JWTPayload) => boolean) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 10_000) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), keys, {
      issuer: "https://token.actions.githubusercontent.com", audience,
      algorithms: ["RS256"], maxTokenAge: "5m", clockTolerance: 5,
    });
    // One invocation per run attempt, even if the workflow obtains multiple JWTs.
    return trusted(payload) ? `${payload.run_id}:${payload.run_attempt}` : null;
  } catch { return null; }
}
export const googleWorkerIdentity = (request: Request) => workerIdentity(request, GOOGLE_WORKER_AUDIENCE, trustedGoogleWorkerClaims);
export const recoveryWorkerIdentity = (request: Request) => workerIdentity(request, RECOVERY_WORKER_AUDIENCE, trustedRecoveryWorkerClaims);
