# Runtime configuration escrow — approved bootstrap

Scope: CONFIG-ESCROW-20261002. Preserve existing session, MFA, private-media,
Google and VAPID keys; no rotation. This is not a general environment export.

## Access and encryption

- Endpoint defaults off; production requires `BACKUP_CONFIG_ESCROW_ENABLED=1`.
- Only signed GitHub OIDC for immutable Cool-Ass/CoolInk main `backup.yml`,
  hosted runner, schedule/manual event, age at most five minutes.
- RSA SPKI recipient (3072/4096 bits) digest is included in verified audience;
  replacing the recipient invalidates the token. AES-256-GCM with authenticated
  run/purpose/recipient/deployment metadata; RSA-OAEP-SHA256 key wrapping.
- Browser-origin/cookie requests rejected. Bounded input; one receipt per run
  attempt; fixed allowlist. Exceptions and key values never logged.
- CLI locally decrypts only for validation. Recipient private key and sealed
  payload are private runner files, uploaded **only inside password-encrypted
  backup archive**, never as separate artifacts or plaintext logs.

## Activation after exact-revision checks

1. Verify staged production deployment of approved main commit, no migrations.
   Domain auto-assignment must remain disabled. A preview is not sufficient.
2. Run main backup with `runtime_config=true` and the verified staged production
   URL as `runtime_deployment_url`. CLI allows only cool-ink / Cool-Ass Vercel
   naming scope and requires staged deployment revision to equal workflow SHA.
3. Run default main restore drill for that exact successful backup. Configuration
   envelope must decrypt and match manifest. Record run/artifact/checksum.
4. Do not call A01 closed: restoring key envelopes, database counts and media
   bytes does not prove restored Auth login, MFA, OAuth or private-media serving.
   These require a separate isolated runtime drill and documented RPO/RTO.
5. After final release, scheduled capture can use repository variable
   `BACKUP_RUNTIME_CONFIG=true` and the public domain. Until enabled, ordinary
   backups explicitly remain without configuration escrow. A staged URL is a
   bootstrap override, not a permanent URL for future runtime revisions.

Rollback: disable feature flag and redeploy known-good code, or revert endpoint;
no key rotation or production data restore. Existing encrypted archives remain
readable with their backup password. No secrets belong in this document.

## Evidence before promotion

- Targeted crypto/identity/route/mutation tests: 13 PASS; typecheck PASS.
- PR #27 tooling-only merged after CI 37001049836 SUCCESS; no application or
  migration changes. Fresh main backup 37001930017 SUCCESS, artifact
  11224118113, archive zip digest
  `b6aeb66c7b33ae08078b2249ec50cf66a31ad2b6280dab115dd990b7cc8e7490`.
- Main offline restore 37002286826 SUCCESS: public/auth/storage counts and media
  bytes. This artifact did not capture runtime configuration.
- Vercel production flag saved 2026-10-02 11:42 UTC for the next build. Existing
  application has no escrow route; no new domain promotion was performed.
- Current PR #28 endpoint/workflow revision still needs complete exact-SHA CI,
  staged capture and new configuration-aware drill. No complete-release claim.
