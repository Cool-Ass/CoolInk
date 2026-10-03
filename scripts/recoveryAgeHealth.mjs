// Metadata only. A successful workflow without its saved artifact is not a backup.
export function recoveryAgeHealth({ backup, artifact, drill, now = Date.now() }) {
  const reasons = [];
  const trusted = (run, path) => run?.head_branch === "main" && run?.path === path && run?.conclusion === "success" && run?.status === "completed";
  const age = run => now - Date.parse(run?.created_at);
  if (!trusted(backup, ".github/workflows/backup.yml") || !Number.isFinite(age(backup)) || age(backup) < 0 || age(backup) > 36 * 3600000) reasons.push("BACKUP_MISSING_OR_STALE");
  if (!artifact || artifact.expired || artifact.name !== `coolink-encrypted-backup-${backup?.id}` || !Number.isFinite(Date.parse(artifact.expires_at)) || Date.parse(artifact.expires_at) <= now) reasons.push("BACKUP_ARTIFACT_UNAVAILABLE");
  if (!trusted(drill, ".github/workflows/restore-drill.yml") || !Number.isFinite(age(drill)) || age(drill) < 0 || age(drill) > 100 * 86400000) reasons.push("RESTORE_DRILL_MISSING_OR_STALE");
  return { healthy: reasons.length === 0, reasons };
}
