# Recovery evidence monitoring

`recovery-health.yml` checks trusted successful main backup and restore runs,
and the continued presence of the matching encrypted artifact. Backup limit:
36 hours; quarterly restore evidence limit: 100 days. Invalid/future timestamps,
expired artifacts, branch-only runs and a failed triggering main recovery run
are not healthy evidence.

Unhealthy metadata fails the workflow and creates one durable repository issue,
deduplicated by a fixed marker and the GitHub Actions bot identity. It never
automatically closes incidents, deletes backups, restores production data or
queries database credentials. API/alert persistence failure fails the monitor.
The job has a five-minute deadline and one non-cancelling concurrency group.

A persisted issue is evidence of alert persistence, **not** proof that the owner
read it or an email/push was delivered. Record receipt separately. Successful
metadata checks do not certify full application/Auth/private-media recovery.
The existing Google worker separately checks stale export queue age with an
hourly deduplicated owner push and fails with 503 while unhealthy.

Local regression: fresh/missing/stale/future runs; missing/expired/wrong/invalid
artifact metadata. Production workflow execution and owner receipt remain
release-gate evidence to collect after trusted main installation.
