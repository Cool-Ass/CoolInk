# Decyzje i ADR

## A01-BOOTSTRAP-20261002 — narzędzia odzyskiwania przed wydaniem aplikacji

- Zakres istniejącej zgody AUDIT-20260930 i zgody właściciela w bieżącym czacie „Tak” na zaszyfrowany backup bieżącej konfiguracji bez rotacji. Nie dotyczy usuwania ani odtwarzania produkcji.
- Oddzielny branch ai/audit-protected-backup-bootstrap: tylko backup/restore, test snapshot i checkpoint. Brak kodu runtime, migracji i promocji domeny; istniejąca aplikacja pozostaje niezmieniona.
- Cel: zaufany backup z main przed migracjami pakietu PR #26. Aktualny branchowy backup 36953435073 / 255564a i offline restore 36954184397 / 2fdc9e6 potwierdzają public/auth/storage counts, lecz nie zastępują main gate ani pełnego runtime/config/login DR.
- Rollback: revert narzędzi, bez restore źródłowej bazy. Secrets i dumpy tylko wewnątrz szyfrowanego artefaktu; role testowe NOLOGIN/NOSUPERUSER tworzone wyłącznie w tymczasowym coolink_restore.

## ADR-001 — repo jako pamięć operacyjna

- Data: 2026-09-30. Status: przyjęte na jawne zlecenie właściciela w zadaniu
  „W repozytorium Cool-Ass/CoolInk wdroż CoolInk Autopilot v1”.
- Kontekst: sesje Workera nie mogą polegać na historii rozmów.
- Decyzja: zasady w root, checkpoint i rejestry w `docs/autopilot/`; branche
  `ai/*`, dowody SHA/run/PR, jawne stany, ryzyko i bramki.
- Alternatywa: pamięć czatu; odrzucona z powodu braku trwałego audytu w repo.
- Skutek: każda sesja aktualizuje pamięć; dokumenty nie są schedulerem ani
  techniczną ochroną wdrożeń. Bootstrap nie upoważnia do późniejszych zmian
  danych, ustawień bezpieczeństwa czy automatycznego pomijania bramek.

## ADR-002 — zachowanie odroczenia AI/social

- Status: istniejąca decyzja, odnotowana 2026-09-30.
- Źródło: [roadmapa, decyzja 2026-09-12](../ROADMAP_AI_AUTOMATYZACJA_I_ROZWOJ.md).
- Decyzja: AI i automatyczna publikacja blog/social pozostają w przyszłym
  backlogu; Autopilot operacyjny nie zmienia tej decyzji produktowej.

## Rejestr przyszłej zgody

Każdy wpis: ID, data UTC, autor/właściciel, problem, warianty, decyzja,
uzasadnienie, ryzyko, zakres/branch/commit, link do jawnej zgody, warunki,
plan rollback, skutki i decyzja zastępująca. Statusy: PROPOSED, ACCEPTED,
REJECTED, SUPERSEDED. Nie twórz fikcyjnych linków ani zgód z milczenia.

## AUDIT-20260930 — zgoda na poprawki audytu

- Źródło: właściciel w bieżącym czacie „Przeprowadź audyt UI UX aplikacji”, odpowiedź „tak” na prośbę o upoważnienie do przygotowania, testowania i wdrażania kolejnych poprawek audytu bez dodatkowych potwierdzeń.
- Zakres: poprawki audytu technicznego z 2026-09-29, kolejno według priorytetu; zgoda zastępuje wymaganie każdorazowej akceptacji commitu dla tego zakresu, nie znosi testów ani kontroli wdrożeń.
- Wyłączenia: usuwanie danych produkcyjnych i przywracanie produkcyjnej bazy pozostają niedozwolone bez odrębnej zgody.
- Pierwszy pakiet: A01 (częściowo) zapisany artefakt jako źródło drill; A02 wspólny snapshot dumpa i liczników. Brak migracji i zmian danych źródłowych. Rollback: revert workflow/skryptu; żadnego restore produkcji.
