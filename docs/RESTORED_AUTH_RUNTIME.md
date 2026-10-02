# Isolated restored Auth runtime — A01 diagnostic

Scope AUDIT-20260930: read a trusted encrypted main backup and restore **only in
the disposable GitHub runner database `coolink_restore`**. Never connect to a
production DB or Supabase project; no caller-supplied DB URL is accepted.

The drill starts official `supabase/gotrue:v2.196.0` (version verified against
[Supabase self-hosted compose](https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml)
on 2026-10-02), loopback only. SMTP and external OAuth providers are not
configured. The signing key is new disposable test material, not a replacement
for production keys. Container/environment files remain private to the runner.

Checks: API enumerates exactly every restored Auth identity and all linked CRM
identities; then a freshly generated fixture in that **offline database** proves
password login and `/user` verification. No customer's password is requested or
tested. Inventory IDs, emails, JWTs and server diagnostics are never logged.

Two local inventory tests, syntax, changed-file lint and typecheck PASS. Actual
GoTrue startup and restored inventory require a diagnostic workflow run before
this can be considered successful. This is not full application DR: MFA/Google
decryption, private-media serving, complete application login and approved
RPO/RTO remain separate checks. No production-domain promotion.

Rollback: remove this additional offline check if incompatible, keeping failure
explicit and A01 open; never change the source DB or rotate production keys to
make a drill pass.
