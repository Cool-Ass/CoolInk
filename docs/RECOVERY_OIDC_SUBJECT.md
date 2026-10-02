# Runtime configuration capture — immutable subject

2026-10-02: main capture 37016079503 failed at recipient-identity.
Expected-claim diagnostics: issuer/audience/repository/immutable IDs/branch/workflow
all true, subject false. No configuration artifact created or secret rotated.

Read-only GitHub repository OIDC settings explicitly report use_default=true,
use_immutable_subject=true and prefix repo:Cool-Ass@319302461/CoolInk@1341372006.
The required main subject is therefore:
repo:Cool-Ass@319302461/CoolInk@1341372006:ref:refs/heads/main.

Correct the CLI expected equality and Vercel Trusted Source sub. Keep issuer,
audience, immutable IDs, exact main backup workflow and Production-only scope.
Do not opt out of GitHub's immutable subject or disable Vercel protection.

Primary reference: https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims
GitHub endpoint: GET /repos/Cool-Ass/CoolInk/actions/oidc/customization/sub.
This change has no migration or application authorization relaxation. Rollback:
revert CLI diagnostics only; do not rotate keys or restore production.
