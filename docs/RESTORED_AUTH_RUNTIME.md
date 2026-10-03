# Isolated restored Auth runtime — A01 diagnostic

2026-10-03 follow-up: the cryptographic drill now keeps restored GoTrue alive
during the actual Next production-build client login. A loopback-only routing
gateway maps just password grant and user verification to that real Auth API;
it does not simulate an identity or verify a synthetic client JWT. One fresh
offline Auth fixture proves app login, CRM linking, authenticated notifications,
anonymous/admin boundary rejection and logout-cookie clearing. Credentials
stay in memory, logs are suppressed, exact fixture cleanup stays local.
When runtime config is absent, the earlier Auth-only drill still runs. With
config, a single integrated Auth/application pass avoids duplicate container
startup. The new HTTP path remains unverified until its saved-artifact drill
succeeds. It is not proof of recovered private-media HTTP serving.

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

Three local inventory/search-path tests PASS. Diagnostic run 37006653072 failed
at managed migration `20250731150234_add_oauth_clients_table.up.sql` (SQLSTATE
42703). GoTrue resolves its unqualified `schema_migrations` ledger using the
connection search path; the restored owner is postgres, not the hosted Auth
role. The drill now explicitly uses `auth,extensions,public` only on its local
Auth connection. No source schema or migration markers are changed. Diagnostic
37007317998 / 94168e5 SUCCESS: restored users 32, linked clients 22, isolated
password grant and /user verification PASS in 6005 ms. This is not full
application DR: MFA/Google
decryption, private-media serving, complete application login and approved
RPO/RTO remain separate checks. No production-domain promotion.

Rollback: remove this additional offline check if incompatible, keeping failure
explicit and A01 open; never change the source DB or rotate production keys to
make a drill pass.

The staged runtime-key capture is blocked by Vercel Deployment Protection, not
missing source credentials. Recovery will use a short-lived GitHub OIDC trusted
source scoped to Cool-Ass/CoolInk, main, backup.yml, production only, audience
https://github.com/Cool-Ass. A separate key-bound token remains required by the
escrow application. No static bypass secret or public exception is necessary.

## Record-level cryptographic verification

`verifyRestoredCrypto.ts` is restricted to a disposable GitHub runner and a fixed
loopback `coolink_restore` database. It uses a read-only transaction, ignores
caller DATABASE_URL, and checks actual restored MFA seeds, all stored Google
refresh tokens and the encrypted reviews credential using the application's
cryptographic functions. Recovered keys stay in runner memory; ambient crypto
keys are cleared first. Session signing and private-media audience/owner
signature rejection are checked with isolated probes. Output is aggregate only;
zero records means zero coverage, not proof that MFA or OAuth was configured.

Local record/key mismatch tests PASS. Actual verification requires a captured
runtime-config archive; the prior main backup has none. This does not replace
full HTTP/application login or restored private-media serving and does not make
any external Google/production request. No source data is changed.
