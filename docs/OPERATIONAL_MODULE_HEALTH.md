# Independent operational health receipts

The old cron ran Google export/import and reminders in one operationalJob.
Its `operational.reminders` failure could therefore mean either module.
Manual Google sync updated only GoogleCalendarConnection.lastSyncedAt,
never `operational.reminders.success`. Do not infer which module failed
from old combined audit history and do not rewrite that history.

New append-only AdminAuditLog actions:

- `operational.google_calendar_sync.success` / `.failure`
- `operational.reminders_worker.success` / `.failure`
- `operational.recovery_monitor.success` / `.failure`

Each module reads latest success and failure independently, preserving both
timestamps and only allowlisted errorCode. No 24h expiry for new failures.
Unknown receipt is unknown, not healthy; simultaneous failure is conservative.
No tokens, Google payloads, customer data or provider exception text in receipts.

Full manual sync records Google outcome, including remaining outbox/conflicts.
Partial sync reports a warning rather than success. One-account manual sync
cannot clear another connection's failure; a limited cron batch cannot clear
uninspected connections. Export-worker success alone never certifies busy import
or OAuth recovery. Later full sync/complete cron batch can clear Google failure.
Google errors no longer prevent reminder delivery; the cron still returns503
when either module fails, and each module keeps its actual receipt separately.

Recovery's canonical freshness authority remains SiteSetting
`internal.recoveryMonitor`, written atomically with its module audit event by
the authenticated recovery endpoint. A Google/reminders success never touches
this key. Stale >2h remains stale even if last recorded report was healthy.
Only a fresh valid report can clear staleness; unhealthy report remains an alarm.
No changes to OIDC, replay handling, cron secrets, schedules or freshness limits.

Production diagnosis2026-10-09: manual sync03:58:16CEST, queue0;
old combined failure08Oct10:18CEST still visible. Recovery run37872966801
completed SUCCESS02:06:32UTC; dashboard then no longer showed recovery delay.
Earlier scheduled recovery runs were separated by several hours despite hourly
cron configuration. Exact cause of scheduling delay is not established.

Regression: manual success/partial/provider failure; independent read/write;
Google failure with reminder success and vice versa; stale/fresh recovery;
auth/replay/persistence boundaries. Local89 files/402 tests/types/lint PASS.
Deployment still requires owner approval, exact head/main CI, smoke and15min
observation. Verify fresh scheduled recovery report and real Google sync,
not a fabricated production failure/heartbeat. Rollback413ca66 code-only.
