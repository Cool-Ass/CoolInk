# Autopilot — 2026-10-13

## FEATURE DELIVERY — aktualny run

- Zlecenie: tekst FEATURE DELIVERY od właściciela,13Oct2026. Branch
  ai/feature-delivery-20261013, baseacd7cb1. Bez automatycznego merge,
  produkcyjnych migracji, zmian rozliczeń i aktywacji płatnych usług.
- A IMPLEMENTING: rozszerzenie PortfolioItem; TattooProject wskazuje wzór.
  Jeden kalendarz, obecne zgody/zadatki, wspólny lock rezerwacji/edycji wzoru,
  version check ceny, blokada unikatów i zachowanie historii. A lokalnie19 testów
  PASS, pełna regresja539/typecheck/lint0errors PASS. Izolowane E2E dodane, pending.
- B IMPLEMENTED, walidacja w toku: timestamp zakończenia z triggera, osobny cron
  i health receipt (bez wpływu na przypomnienia), opt-in harmonogram, idempotentne
  obecne powiadomienia, prywatne zdjęcia gojenia przez dotychczasowy upload,
  konsultacja/obsłużenie i panel admina. Lokalnie15 nowych testów/typecheck PASS.
  Nowe hooki/constraint dołączone do izolowanego setupu; E2E pending.
- C IMPLEMENTED, walidacja w toku: podpis odręczny dla sesji, zachowane globalne
  akceptacje, niezmienny snapshot + digest, prywatny PDF (lokalna font OFL),
  QR i lista brakujących zgód admina, archiwum klienta. Nowa tabela z RLS,
  privacy guard i zakazem modyfikacji; usunięcie sesji zachowuje archiwum.
  Lokalnie18 nowych testów/typecheck PASS, lint0errors; E2E dodane, pending.
  Migracje nieuruchomione; brak merge/publikacji nowych modułów.
- D IMPLEMENTED, walidacja w toku: zakładka Asystent AI, typowana allowlista
  readonly narzędzi (wspólna bramka dostępności), per-tool RBAC i limity,
  stan bez providera, lokalne szablony bez zewnętrznego AI. Prywatne szkice
  poza strumieniem wiadomości, RLS/privacy guard i kasowanie przy erasure.
  Lokalnie10 testów/typecheck PASS; E2E dodane, pending.
- E IMPLEMENTED, walidacja w toku: wykrywanie dostępnych terminów przez wspólną
  bramkę, rozłączne segmenty historii, szkice ofert/posta/relacji i propozycje
  rabatów; edycja/approval z optimistic lock i audytem. Reużycie Promotion,
  draft/rejected prywatne i nieaktywne także w DB; approval nie publikuje.
  Kod promocji przypisuje nowe zgłoszenie do istniejącej oferty bez zmiany ceny.
  Lokalnie16 testów/typecheck PASS; E2E dodane, pending.
- F IMPLEMENTED: rozszerzone istniejące statystyki o kodowe przypisanie promocji,
  wpływ na godzinę rozliczonej sesji, prognozę dopłat (bez podwójnego zadatku);
  powracający uwzględniają wcześniejsze wizyty poza okresem. Obłożenie już było
  dostępne — bez duplikatu. Brak powodów anulowania/wyświetleń/kosztów reklam
  jawnie oznaczony, bez domyślnych atrybucji/ROI. Lokalnie4 testy PASS.
- Końcowa walidacja w toku: pełne602 testy/106 plików, typecheck i Turbopack
  build PASS. Font PDF obecny w trace. Lint0errors/19warnings (głównie istniejące
  obrazy). Review ograniczył sondowanie terminów i agreguje segmenty w SQL;
  nowy index promotionId. PR57 draft, head17b1bf7: CodeQL i backup-snapshot PASS;
  izolowane RLS/IDOR PASS, HTTP/browser w toku (run38400975554).
- Review hardening: wspólne pola formularzy według design-system, eksport danych
  obejmuje podpisane snapshoty; rozszerzone testy kwarantanny/erasure szkiców
  i endpointów zatwierdzania kampanii. Lokalnie609 testów/107 plików PASS,
  typecheck PASS; smoke zbudowanego serwera10/10 auth/CSRF PASS (serwer zatrzymany).
- CI17b1bf7: RLS/IDOR/HTTP PASS; Flash race/authoritative price/deposit checks
  passed, UI test stopped at background calendar checkbox (test selector defect).
  Scoped selector to consent fieldset inside booking dialog, no test bypass.
  Review also fixed assistant date links to open the actual calendar week and
  distinguishes resolved aftercare consultations. CI7cc1242 already running;
  keep serialized test DB jobs; final exact-head CI still required.
- Granice: B proces po Appointment.completed z obecnymi powiadomieniami
  i prywatnymi obrazami; C DocumentAcceptance z sesją/podpisem/QR/PDF;
  D readonly RBAC narzędzia, jawny brak provider; E szkice bez wysyłki;
  F agregaty obecnych rozliczeń. Kolejność A→B→C→D→E→F.
  Skalowanie: batch/idempotency automatyzacji i paginacja; MCP/provider później,
  bez własnego frameworka. Addytywne migracje wyłącznie przygotowane lokalnie.
- PR54 DONE: produkcjaacd7cb1 zawiera zadatki wizyt; smoke/obserwacja
  07:50–08:05UTC PASS, Error0%/Timeout0%. Dowody1767d56 na evidence branchu.

## Historyczny run listy oczekujących (zakończony PR55)

- Run: przeprowad-audyt-ui-ux-aplikacji / 01a1334a-fc98-7bc2-ad41-7a20cdb15d13.
- Base: ab52372dcca198f9f0c56859e892b2d66057abbf; initial code d24b0c0e563216ce4eb9d55e0a896afc06a4eb14; branch ai/waitlist-integrity-20261013, PR55.
- VERIFYING PR55: WAITLIST-INTEGRITY-20261013, MEDIUM (existing booking behavior; no schema/auth/finance changes).
- One local worker; app thread inventory shows no other active CoolInk worker; no open waitlist PR.
- Acceptance: concurrent offers cannot orphan reservations; join/leave/status/expiry/response reread under the existing calendar lock; confirmed appointments survive leaving the waitlist; automation uses current preferences and the existing availability gate.
- Validation: deterministic race regression tests, full Vitest, types, lint, build; isolated HTTP/browser checks only when test credentials are available.
- Rollback: revert code; no migration, production mutation, customer broadcast, merge or deployment.
- Completed: lock and fresh reads for manual offer/join/leave/status/response/expiry; preserve accepted visits; automation rechecks archive/preferences/duration and explicit availability; response uses service/workstation buffers and refuses past starts; cron syncs cancellations and preserves confirmed sibling sessions; strict date/weekdays/time parsing.
- Tests before fix: 20/24 new regression cases failed. Final local full suite: 99 files / 520 PASS (37 waitlist cases); typecheck PASS, lint 0 errors / 15 existing image warnings, default Turbopack build PASS, production dependency audit 0 vulnerabilities, browser spec syntax and diff check PASS. Local built-server auth/CSRF smoke10/10 PASS; server stopped. No local isolated DB credentials; exact-head browser cases run in existing CI.

| Area | Verified source / result | Remaining scope |
|---|---|---|
| A — PARTIAL | client appointments + proposed-appointment routes; bookingRules/appointmentAvailability; Google sync/outbox; /app/terminy; Appointment[] and visitDeposit | Runtime Google/payment delivery UNVERIFIED locally; waitlist inconsistency fixed here. |
| B — PARTIAL | StudioDocument/Version/Acceptance models, document APIs, ClientDocuments, documentForms and admin workspace: versioned authenticated acceptance/forms/archive | No captured handwritten/digital signature, QR/PDF generator or acceptance-to-session relation in current schema/API/UI. Deferred. |
| C — PARTIAL | category=aftercare documents, messageTemplates.aftercare and existing private image/chat routes | Cron plans are pre-visit 72/24h; no structured healing/photo/review post-session automation. Deferred; no SMS. |
| D — BROKEN → FIXED LOCALLY | WaitlistEntry, waitlist.ts, automation, offer/response/status/client/cron APIs | Database/browser concurrency regression and exact-head CI pending. |
| E — MISSING | PortfolioItem + portfolio/media/project/booking endpoints inspected; portfolio stores presentation fields only | No reservable design identity, optional session price/time or unique claim. Deferred behind integrity fixes. |
| F — EXISTS (code/tests) | Appointment deposits and legacy explicit assignment; finance view; Promotion; LoyaltyEntry unique visit/key, serialized settlement and audit | Live financial reconciliation UNVERIFIED; no duplicate financial mechanism introduced. |
| G — MISSING | package dependencies, API/lib inventory and webhook implementation inspected; automation webhook handles healthcheck only | No AI tool layer/MCP/provider. Lightweight readonly assistant deferred from this bounded integrity patch; no paid service enabled. |
| H — MISSING | Promotion calendar codes are marketing metadata; finance/schema/API inspected | No voucher balance/redemption ledger. Deferred to avoid introducing financial rules in this patch. |

- Security review: existing same-origin/session/operations permission and owner-scoped client reads retained; writes/notifications remain transactional; external push/Google run after commit. No production requests or writes.
- Next: exact-head isolated CI/browser/RLS/security, review; no merge/deployment. Code-only rollback. Optional modules above are unimplemented, not production defects proven by this run.
- CI38342933533 / 5daabc3: CodeQL, backup-snapshot, all unit/build/audit/gitleaks, isolated DB/RLS/IDOR/roles and HTTP smoke PASS; browser concurrency FAIL (201/409/500/500). The 2-connection pool and Prisma's default 2s acquisition/5s interactive transaction budgets are the suspected cause; no claim of confirmed Prisma error code. Manual offers now have bounded 10s acquisition / 15s transaction budgets; the 4-request assertion is unchanged. Failure diagnostics expose only fixed Prisma error codes. Rerun required before review. Both Vercel previews passed the initial head. No promotion.
- Final review: expiry also handles offers changed through the general admin appointment API: accepted/completed visits reconcile to booked; cancelled/no-show offers return to active. Reoffering uses the current range read under the lock. Two additional regression cases cover these transitions.
