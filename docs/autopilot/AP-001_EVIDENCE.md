# AP-001 — weryfikacja bramek promocji

Data: 2026-09-30
Baza main: `64921b3859b4832894595e158200683e53db7a70`
Status: BLOCKED dla auto-deploy

## Potwierdzone

- PR #17 (`ca784a3f`) ma udany Quality and security run #61.
- Preview Vercel PR #17 jest Ready dla `cool-ink` i `cool-ink-build`.
- Main HEAD ma status Vercel success dla obu projektów.
- `.github/workflows/security.yml` obejmuje audit zależności, lint, typecheck, Vitest, build, gitleaks, CodeQL oraz izolowane testy DB/HTTP.

## Blokery

1. Brak potwierdzonego browser E2E; HTTP smoke nie jest jego zamiennikiem.
2. Dostępny interfejs GitHub nie pozwolił potwierdzić branch protection i required checks dla main.
3. Brak potwierdzonego technicznego mutexu Workera. Concurrency dodane w PR #17 dotyczy współdzielonej testowej bazy, nie samego Workera.
4. PR #17 zawiera migrację `hiddenFor` i zmianę zachowania wiadomości, więc nie może zostać automatycznie zmergowany przez Worker bez wymaganej zgody i backup gate.

## Następny krok

Dodać prawdziwy browser E2E jako required check, potwierdzić ochronę main oraz techniczny mutex Workera. Do tego czasu auto-deploy pozostaje wyłączony.
