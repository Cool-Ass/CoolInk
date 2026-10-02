# Decyzje i ADR

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
