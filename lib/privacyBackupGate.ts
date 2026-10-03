/** Read-only public GitHub metadata. No owner-supplied URL or provider secret. */
export async function privacyBackupGate(runId: string, now = Date.now()) {
  if (!/^\d{1,30}$/.test(runId)) throw new Error("Wskaż identyfikator świeżej kopii z main.");
  const base = "https://api.github.com/repos/Cool-Ass/CoolInk/actions";
  const get = async (path: string) => {
    const response = await fetch(base + path, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000), headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error("Nie można potwierdzić kopii bezpieczeństwa.");
    return response.json();
  };
  const run = await get(`/runs/${runId}`);
  const age = now - Date.parse(run.created_at);
  if (run.head_branch !== "main" || run.path !== ".github/workflows/backup.yml" || run.status !== "completed" || run.conclusion !== "success" || !Number.isFinite(age) || age < 0 || age > 3600_000) throw new Error("Wykonaj udaną kopię main bezpośrednio przed usuwaniem — maksymalnie godzinę wcześniej.");
  const artifacts = await get(`/runs/${runId}/artifacts?per_page=100`);
  const artifact = artifacts.artifacts?.find((item: { name: string }) => item.name === `coolink-encrypted-backup-${runId}`);
  if (!artifact || artifact.expired || Date.parse(artifact.expires_at) <= now || !/^sha256:[a-f0-9]{64}$/.test(artifact.digest || "")) throw new Error("Brak dostępnego zaszyfrowanego artefaktu kopii.");
  const drills = await get("/workflows/restore-drill.yml/runs?branch=main&status=success&per_page=1");
  const drill = drills.workflow_runs?.[0];
  const drillAge = now - Date.parse(drill?.created_at);
  if (!drill || drill.head_branch !== "main" || drill.conclusion !== "success" || drill.head_sha !== run.head_sha || Date.parse(drill.created_at) < Date.parse(run.created_at) || !Number.isFinite(drillAge) || drillAge < 0 || drillAge > 90 * 86400_000) throw new Error("Wymagany udany test odtworzenia po świeżej kopii, dla tej samej wersji main.");
  return { runId, artifactId: String(artifact.id), digest: artifact.digest as string, drillRunId: String(drill.id) };
}
