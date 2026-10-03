# Decyzje i ADR

## ADR-003 — Autopilot v2: router poza granicą uprawnień

- Data: 2026-10-03. Zlecenie właściciela w tym czacie dotyczy wdrożenia
  propozycji „wdrażamy to do CoolInk”: Clef → sandbox → agent → testy → PR.
- Zakres bootstrapu: implementacja i testy w branchu, PR, instrukcja konfiguracji
  runtime. Nie obejmuje samodzielnego zatwierdzania przyszłych zmian polityki,
  dostępu do danych produkcji ani pomijania AP-001/release gates.
- Decyzja: model jedynie proponuje decyzję z allowlisty; uprawnienia kontroluje
  runner hosta i polityka OpenShell. Fail closed przy błędzie API/niepewności.
  Pierwszy adapter wykonawczy: OpenCode, OpenShell v0.1.2.
- Wynik agenta: niezaufany patch i raport. Brak auto-apply, push, merge i deploy.
  Harmonogram GitHub wykonuje tylko plan bez credentiali modelu/runtime.
- Szczegóły i rollback: [AUTOPILOT_V2](AUTOPILOT_V2.md). Żywe Clef/OpenShell
  i globalna wyłączność wielu hostów wymagają osobnej weryfikacji operacyjnej.

## CONFIG-ESCROW-20261002 — bieżące klucze, bez rotacji

- ACCEPTED: właściciel w tym czacie odpowiedział „Tak” na escrow kluczy, a następnie zlecił wspólny przegląd UI/UX przed produkcją. Zakres nie obejmuje usuwania ani odtwarzania produkcji.
- PR #28 tylko runtime-key recovery bootstrap: endpoint domyślnie wyłączony, podpisany OIDC dokładnego main backup.yml, audience powiązany z RSA recipient, stała allowlista, jednorazowy run attempt, szyfrowanie hybrydowe. Testy potwierdzają brak cookie/browser authority i ujawniania wyjątków.
- Zapisano produkcyjną flagę BACKUP_CONFIG_ESCROW_ENABLED=1 do następnego buildu. Capture może wskazać zweryfikowany staged production URL tego projektu z dokładnym SHA, bez przypisywania domen. Nie wymieniać wartości istniejących sekretów.
- Rollback: flaga 0 i znany dobry redeploy albo revert endpointu. Dowody w RUNTIME_CONFIG_RECOVERY.md; pełny A01 nadal wymaga runtime/login drill. Zgoda nie zastępuje exact-SHA CI ani bramki publikacji.

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
