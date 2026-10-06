# Decyzje i ADR

## ANNOUNCEMENT-RICH-20261007

- Właściciel zlecił formatowanie/emoji/obrazy. MEDIUM, publikacja po zatwierdzeniu
  finalnego pakietu i pełnych testach; aktualizacja sharp0.35.5 jeszcze niezaakceptowana.
- Text-only markup renderowane elementami React, nie HTML. Format „plain”
  dla dawnych wpisów, bez migracji. Wspólny renderer preview/history/client.
- Maks4 zdjęcia z publicznej tabeli Media, upload przez istniejący CMS endpoint.
  Nie mieszać z prywatnymi inspiracjami/czatem; ostrzeżenie przy dodawaniu pliku.
- Nie omijać sharp audit. Produkcja PR41 pozostaje niezmieniona.

## ANNOUNCEMENTS-CMS-20261006

- ACCEPTED: właściciel odpowiedział „Zatwierdzam” po opisie finalnego PR41
  (komunikaty, spójność CMS, wymagany minimalny security patch).
- CI37423946945 wykrył503 w nowym E2E publikacji. Advisory lock PostgreSQL
  zwraca void; użycie queryRaw próbowało dekodować nieobsługiwany typ.
  Przeniesiono wszystkie3 locki na executeRaw jak w bookingRules. Bez zmiany
  funkcji/uprawnień lub pominięcia asercji; nowy exact CI wymagany.

- Właściciel zlecił komunikaty masowe z opcjonalnym powiadomieniem i możliwość
  wyłączenia, następnie wskazał niespójność Pages/Portfolio/Media. MEDIUM,
  osobny PR, zgoda na finalny zakres przed merge/publikacją pozostaje wymagana.
- Wybór: komunikat głównego panelu + istniejący dzwonek. Nie inferujemy zgody
  na marketing email/push ani nie wysyłamy próbnej kampanii na produkcji.
- Istniejące SiteSetting/ClientNotification bez migracji. Markery zamknięcia
  wykluczone z list/dzwonka i usuwane przez istniejące wykonanie privacy.
- UI reuse WorkspaceHeader/studio tokens/AppButton; canvas buildera bez zmian.
- Ryzyka, lifecycle i plan walidacji: docs/CLIENT_ANNOUNCEMENTS.md.

## TEXT-GROUP-20261006

- ACCEPTED: właściciel odpowiedział „Tak, opublikuj po testach” na prośbę
  obejmującą trzy zmiany PR40. Dowód zgody:
  https://github.com/Cool-Ass/CoolInk/pull/40#issuecomment-6006361951.
- 9b44b46 zmienia wyłącznie reset scrolla fixture przed testem drag; funkcje
  aplikacji bez zmian. Nowy exact CI37394486798 SUCCESS. Mergead434aa,
  exact-mainCI37395584488 SUCCESS, ręczna promocja00:56:43UTC, obserwacja trwa.

- 00:23UTC: właściciel dodatkowo zlecił obraz jako nakładkę tła oraz wskazał
  ciemne tło PNG w widżecie. Zakres PR40 rozszerzony, MEDIUM; poprzedni LOW
  nie upoważnia do automatycznej publikacji rozszerzonego pakietu.
- Przyczyną wymuszonego tła jest bg-ink-charcoal w ramce wczytanego Obrazu.
  Konwersja uploadu zachowuje alpha, nie zmieniano backendu ani dawnych plików.
- Nowe pola stylu są opcjonalne; bez obrazu stare nakładki koloru bez zmian.
  Dodanie pierwszego obrazu do wyłączonej nakładki ustawia krycie100%,
  dalsze zmiany zachowują ustawione krycie. Usunięcie obrazu zachowuje kolor.
- Publikacja oczekuje zgody właściciela na rozszerzony PR40 i nowych exact checks.

- Właściciel wskazał screenshot i zlecił: „no to popraw błąd” po potwierdzeniu,
  że obrys/cień tekstu należą do sekcji Tekst, nie osobnego wiersza poza nią.
- LOW, wyłącznie przeniesienie granicy JSX PanelSection w wspólnym komponencie.
  Bez zmian wartości, zapisów CMS, schematu, reguł finansowych lub popoverów.
- Regresja browser: poprawny rodzic, zwijanie/rozwijanie, otwarcie okna,
  Escape i focus. Publikacja wyłącznie po obowiązujących dokładnych bramkach.
- Rollback:8a9431e/fLYEoVMDMxwLS9B7iDeRuSJDdJAX, bez restore danych.

## COMPACT-WORKFLOW-20261005

- Właściciel zlecił: sesje od najnowszej, prostszy workflow edycji/rozliczenia,
  kompaktowe wspólne kontrolki inspirowane dołączonymi screenami oraz
  prowadnice przeciągane w px z kątem i duplikowaniem.
- MEDIUM, osobny PR. Bez zmiany zasad pieczątek, płatności, API, schematu,
  auth lub infrastruktury. Rozliczenie nadal wymaga świadomego potwierdzenia.
- Wspólny inspector portalowy zapobiega ucinaniu przez scroll sidebara;
  ustawienia typografii/kolorów/obrysu rozwijane na żądanie. Fonty ograniczone
  do rzeczywiście zainstalowanych; globalne kolory powiązane z motywem.
- Prowadnice wyłącznie w edytorze, maks32, brak zapisu do opublikowanej strony.
  X/Y określają punkt obrotu względem lewego/górnego brzegu;0° poziom/90° pion.
- Rollback: obecny publiczny202c8f1/CXSorzy7faJTyhSr2PNCPynFVXRS bez restore.
- Kryteria: dokładny CI/E2E/security SHA, focus/Escape/nested popovers,
  desktop/mobile, kolejność i reset formularza bez naliczenia testowej płatności.
- ACCEPTED: właściciel zatwierdził PR39: „Tak, opublikuj po testach”. Dowód
  https://github.com/Cool-Ass/CoolInk/pull/39#issuecomment-6001879191.
  Zgoda obejmuje ten UI-only zakres; brak promocji przed exact-SHA checks.
- Wykonane: PR39 merged main8a9431e, exact-main CI37388586456 SUCCESS,
  ręczna promocja2026-10-05 23:37:35UTC. Ponad15min obserwacji PASS do23:54:07UTC,
  Error0%/Timeout0%, readonly smoke i bramka kolejnych publikacji potwierdzone.

## AUDIT-FINAL-20261003 — kontynuacja do pełnej publikacji

- ACCEPTED: właściciel w bieżącym czacie: „kontynuuj. masz moje wszystkie zgody.
  daj znac jak juz wszystko wdrozysz na produkcje”.
- Zakres: dokończenie istniejącego audytu A10/A14, walidacja, migracja
  ochrony wykonania prywatności, merge PR26 i ręczna promocja po bramkach.
  AI/social pozostają odroczone. Nie wybieramy rzeczywistego klienta
  do usunięcia ani nie odtwarzamy produkcji; wykonanie konkretnego wniosku
  wymaga oddzielnej świadomej decyzji właściciela w panelu i świeżego backupu.
- A10: retencja prawnych zapisów, kontrolowana kwarantanna, osobna fraza
  potwierdzenia, dziennik i retry bez odtwarzania usuniętych danych.
  Testy kasują wyłącznie oznaczone fixtures izolowanej bazy.
- A14: zapis raportu OIDC w panelu właściciela, trwałe alarmy niezależne od
  push, wykrywanie braku heartbeat, issue GitHub przy niedoręczonym raporcie.
  Zapis w panelu nie jest dowodem przeczytania powiadomienia przez człowieka.
- Rollback: poprzedni artefakt aplikacji, bez przywracania Auth/plików ani
  kaskadowania legalnych danych; ochronę zamkniętych profili zachować.
  CI/backup/restore/publication gate nie są pomijane przez tę zgodę.

## PRIVATE-PRODUCTION-MEDIA-20261003

- ACCEPTED: właściciel w bieżącym czacie odpowiedział „tak” na osobny,
  bezpłatny prywatny magazyn produkcyjny zdjęć klientów, przy zachowaniu
  obecnego publicznego magazynu strony bez zmian.
- Zakres HIGH: nowy Private Blob store, oddzielny token
  PRIVATE_BLOB_READ_WRITE_TOKEN dla aplikacji i backupu; rozdzielenie
  uploadów/odczytów/usuwania prywatnych zdjęć od publicznych zasobów CMS.
  Testowy magazyn nie jest repurposed; brak płatnego planu i rotacji starego klucza.
- Backup obejmuje oba magazyny. Nie usuwać ani migrować źródłowych plików.
  Publikacja nadal wymaga wszystkich bramek; rollback kodu/config bez kasowania
  zapisanych zdjęć. Ta zgoda nie obejmuje usuwania rzeczywistych klientów.

## MEDIA-RESTORE-20261003

- ACCEPTED: właściciel odpowiedział „zgadzam się” na odtworzenie prywatnych
  zdjęć w osobnym, prywatnym magazynie testowym, bez zmian w produkcji i bez
  uruchamiania płatnego planu. Zgoda dotyczy testu z zaszyfrowanej kopii,
  nie publikacji zdjęć, migracji produkcyjnego magazynu ani rotacji jego kluczy.
- Zakres HIGH: izolowany magazyn, token tylko do niego, twarda identyfikacja
  docelowego store, weryfikacja sum i odczytu aplikacji dla uprawnionej roli
  oraz odmowy dla anonimowego/cudzego konta. Nigdy nie używać produkcyjnego
  BLOB_READ_WRITE_TOKEN do zapisu testowego. Dane nie trafiają do repo/logów.
- Rollback: usuń wyłącznie jawnie zapisane obiekty utworzone przez tę próbę;
  źródło pozostaje nienaruszone. Brak płatnego planu jest warunkiem zgody.

## PRIVACY-REVIEW-20261003 / OWNER-MFA-20261003

- ACCEPTED: właściciel w tym czacie „jak mam potwierdzić to potwierdzam”;
  potwierdzono indywidualną decyzję właściciela o retencji oraz osobne
  zatwierdzenie wykonania usuwania. Wdrożenie mechanizmu nie upoważnia
  Workera do usunięcia żadnego rzeczywistego klienta podczas publikacji.
- Właściciel następnie „ok dziala mam, kontynuuj” potwierdził działanie MFA
  i zapisanie nowych kodów awaryjnych. Nie zażądano kodów ani sekretu.
- Pakiet A10: owner-only audytowana ocena wniosków, podstawa i termin retencji,
  jawny status dla klienta. Nie oznaczać danych jako usuniętych po samym zapisie
  decyzji. Wykonanie destrukcyjne musi być osobno zatwierdzone w konkretnym
  przypadku, z gate kopii/restore i bez kasowania wymaganej historii.
- Walidacja: origin, RBAC/IDOR, walidacja planu, CAS i rollback transakcji;
  izolowane testy HTTP/browser przed publikacją. Rollback: revert kodu,
  zachowanie wniosków i wpisów audytu, bez restore produkcji.

## CONFIG-ESCROW-20261002 / UX-20261002

- Status: ACCEPTED, źródło: właściciel w bieżącym czacie, „Tak. Dodatkowo przed wdrożeniem…”.
- Zgoda obejmuje zaszyfrowane escrow bieżącej konfiguracji i kluczy MFA/Google, bez rotacji i bez ujawniania wartości w logach, repo ani czacie. Nie obejmuje odtworzenia ani usuwania produkcyjnych danych.
- Dodatkowy zakres MEDIUM: wspólny przegląd UI/UX admina i klienta, spójny kalendarz, subtelny ruch z reduced-motion, kompaktowy builder oraz swobodnie komponowany hero. Nie zmienia cen, uprawnień ani zasad rezerwacji.
- Walidacja: regresja obu paneli i buildera, klawiatura/mobile/reduced-motion; pełne bramki audytu nadal obowiązują przed produkcją. Rollback UI: revert zmian prezentacji bez restore bazy.
- Diagnostyka A01: backup readonly 36953435073 / 255564a z tej zgody może być odtworzony wyłącznie w tymczasowym PostgreSQL runnera. Tryb audit_preflight jest przypięty do tego run/SHA i brancha; nie zastępuje wymaganego backupu main ani nie zmienia bramki publikacji. Zapis konfiguracji runtime pozostaje osobnym nieukończonym krokiem.
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

## HOSTING-GATE-20261002 — ręczna promocja po testach

- Status: ACCEPTED. Właściciel w bieżącym czacie odpowiedział „Tak, ustaw bezpieczną publikację po testach” na pytanie o wyłączenie automatycznego przypisania domen produkcyjnych Vercel.
- Zakres: projekt `cool-ass/cool-ink`, Production, wyłączenie `Auto-assign Custom Production Domains`; istniejące wdrożenie i domeny pozostają aktywne. Nowe wersje promowane dopiero po bramkach audytu.
- Ryzyko: HIGH (konfiguracja hostingu). Nie upoważnia do usunięcia danych, zmiany sekretów ani publikacji niezweryfikowanego SHA.
- Rollback: ponowne włączenie opcji po uzgodnieniu z właścicielem; nie zmienia danych bazy.
- Uwaga: ustawienie domen nie blokuje samego builda/migracji. Backup i wszystkie testy muszą poprzedzać merge do produkcyjnego `main`.
- Wykonanie: zapisano i potwierdzono po ponownym otwarciu strony Vercel Production 2026-10-02 około 01:05 UTC: `Disabled`, checkbox niezaznaczony, komunikat o ręcznej promocji. Nie wdrożono nowego kodu.
