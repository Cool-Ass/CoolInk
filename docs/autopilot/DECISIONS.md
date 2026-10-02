# Decyzje i ADR

## CONFIG-ESCROW-20261002 / UX-20261002

- Status: ACCEPTED, źródło: właściciel w bieżącym czacie, „Tak. Dodatkowo przed wdrożeniem…”.
- Zgoda obejmuje zaszyfrowane escrow bieżącej konfiguracji i kluczy MFA/Google, bez rotacji i bez ujawniania wartości w logach, repo ani czacie. Nie obejmuje odtworzenia ani usuwania produkcyjnych danych.
- Dodatkowy zakres MEDIUM: wspólny przegląd UI/UX admina i klienta, spójny kalendarz, subtelny ruch z reduced-motion, kompaktowy builder oraz swobodnie komponowany hero. Nie zmienia cen, uprawnień ani zasad rezerwacji.
- Walidacja: regresja obu paneli i buildera, klawiatura/mobile/reduced-motion; pełne bramki audytu nadal obowiązują przed produkcją. Rollback UI: revert zmian prezentacji bez restore bazy.
- Diagnostyka A01: backup readonly 36953435073 / 255564a z tej zgody może być odtworzony wyłącznie w tymczasowym PostgreSQL runnera. Tryb audit_preflight jest przypięty do tego run/SHA i brancha; nie zastępuje wymaganego backupu main ani nie zmienia bramki publikacji. Zapis konfiguracji runtime pozostaje osobnym nieukończonym krokiem.

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

## HOSTING-GATE-20261002 — ręczna promocja po testach

- Status: ACCEPTED. Właściciel w bieżącym czacie odpowiedział „Tak, ustaw bezpieczną publikację po testach” na pytanie o wyłączenie automatycznego przypisania domen produkcyjnych Vercel.
- Zakres: projekt `cool-ass/cool-ink`, Production, wyłączenie `Auto-assign Custom Production Domains`; istniejące wdrożenie i domeny pozostają aktywne. Nowe wersje promowane dopiero po bramkach audytu.
- Ryzyko: HIGH (konfiguracja hostingu). Nie upoważnia do usunięcia danych, zmiany sekretów ani publikacji niezweryfikowanego SHA.
- Rollback: ponowne włączenie opcji po uzgodnieniu z właścicielem; nie zmienia danych bazy.
- Uwaga: ustawienie domen nie blokuje samego builda/migracji. Backup i wszystkie testy muszą poprzedzać merge do produkcyjnego `main`.
- Wykonanie: zapisano i potwierdzono po ponownym otwarciu strony Vercel Production 2026-10-02 około 01:05 UTC: `Disabled`, checkbox niezaznaczony, komunikat o ręcznej promocji. Nie wdrożono nowego kodu.
