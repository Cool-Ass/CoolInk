import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const keys = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"), { timeoutDuration: 5000 });
export function trustedBackupClaims(payload: JWTPayload) {
  return payload.repository_id === "1341372006" && payload.repository_owner_id === "319302461"
    && payload.repository === "Cool-Ass/CoolInk" && payload.ref === "refs/heads/main"
    && payload.workflow_ref === "Cool-Ass/CoolInk/.github/workflows/backup.yml@refs/heads/main"
    && ["schedule", "workflow_dispatch"].includes(String(payload.event_name))
    && payload.runner_environment === "github-hosted"
    && /^\d{1,30}$/.test(String(payload.run_id)) && /^\d{1,10}$/.test(String(payload.run_attempt))
    && typeof payload.jti === "string" && payload.jti.length > 0 && payload.jti.length <= 200;
}
export async function backupWorkflowIdentity(request: Request, audience: string) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 10_000) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), keys, {
      issuer: "https://token.actions.githubusercontent.com", audience,
      algorithms: ["RS256"], maxTokenAge: "5m", clockTolerance: 5,
    });
    return trustedBackupClaims(payload) ? `${payload.run_id}:${payload.run_attempt}` : null;
  } catch { return null; }
}
