# CoolInk Autopilot v1 — pamięć i runbook

Zasady nadrzędne: [AUTOPILOT_RULES](../../AUTOPILOT_RULES.md).

## Checkpoint startowy — 2026-09-30

| Pole | Stan |
|---|---|
| Status | WORKING (UX-20261002; zgoda CONFIG-ESCROW-20261002 otrzymana) |
| Aktywne zadanie / run / lease | Jeden aktywny Worker potwierdzony listą czatów. Branch `ai/audit-sync-outbox`; checkpoint 2026-10-02 01:42 UTC, lease do 02:42 UTC. |
| Zbadana baza main | `ed85fb8570fb9626ba6972e1c21e33a4f9996fa8` |
| Następny krok | PR #26: pełne CI 36950973155 SUCCESS dla c83eb29. UI c64bceb ma CI 36953049714 w toku; nowy hero, wspólny kalendarz i mobilna regresja admina. A01: zgoda escrow otrzymana; trwa rozszerzanie szyfrowanego backupu o auth/storage w tym samym snapshot. Nadal konieczne escrow konfiguracji, runtime/login DR oraz zamknięcie A10/A14. Hosting gate ustawiony; brak nowego wdrożenia. |
| Auto-deploy gotowy | Automatyczne przypisywanie domen Vercel wyłączono za zgodą HOSTING-GATE-20261002 i potwierdzono po odświeżeniu. Promocja ręczna dopiero po wszystkich bramkach; sam merge nadal może uruchomić migracje. |
| Scheduler co 5 godzin | Wspomniany w przekazanym kontekście, niezweryfikowany w tej sesji; nie utworzono ani nie zmieniono harmonogramu |

## Kontynuacja 2026-10-02 01:11 UTC

- 02:00 UTC: readonly preflight `backup.yml` na `ai/audit-sync-outbox` / `255564a`, zakres AUDIT-20260930 i CONFIG-ESCROW-20261002: osobny zaszyfrowany dump auth/storage + liczniki w tym samym snapshot. Nie jest escrow kluczy runtime i nie zamyka A01; żadnego restore produkcji. Planowane wywołanie workflow_dispatch; wynik zostanie zapisany po zakończeniu.
- Wynik: backup 36953435073 SUCCESS, artefakt 11205131031, sha256 zip 3ac696716677d83ad278128f50adbee53d2447adb8a9cb9ecbce62bfce98ac76, 2026-10-02 02:00:15 UTC. Planowane audit_preflight offline tego dokładnego run/SHA, bez produkcyjnych połączeń i bez osłabienia publikacji.

- PR #26 integruje niewdrożone PR #19–25. Dodano backoff (attempts/nextAttemptAt/lastError), widoczność wieku kolejki i typów błędów, przypięcie Actions do zweryfikowanych SHA.
- CI `36949088616`: typy, unit tests, build, secret scan, CodeQL i backup-snapshot PASS; izolowany test outbox nie wystartował przez brak wymaganego description w fixture. Poprawka `1edfb07`; CI `36949449852` trwa, bez anulowania pracy izolowanej bazy.
- A14 częściowo: błędy cron/retencji nie są już fałszywym sukcesem; 503 + eventId, alarm admin push i jawna informacja, jeśli alarmu nie doręczono. Test kontrolowanego błędu lokalnie PASS; rzeczywiste doręczenie produkcyjne niezweryfikowane.
- A17: pomiar 20 odczytów czatu i p95 dodany do desktop/mobile E2E; wynik nie jest jeszcze dostępny i nie stanowi pomiaru produkcji.
- A09: przygotowano workflow konsumenta co 10 min, ograniczony czas/batch, bez stałego sekretu. Weryfikacja GitHub OIDC issuer/audience/RS256/age, niezmiennych ID repo/właściciela, main i dokładnego workflow; jeden zapis WebhookReceipt na run attempt chroni replay. Preview odrzucane. Repo potwierdzone publiczne; Fluid Compute Vercel włączone. Testy nowych granic dostępu PASS; faktyczne wywołanie produkcyjne dopiero po promocji.
- Nadal otwarte: A01 pełny DR Auth/config/private media i faktyczne logowanie; A10 pełna obsługa wniosków prywatności; A14 alarm wieku backup/restore/kolejki i dowód doręczenia. Brak nowego wdrożenia produkcyjnego.
- A01 preflight: odczyt Supabase potwierdził brak Auth users w `jqjwdpasbvdopvxvgnwq`; `kqqqhasawqodikpzjemy` niedostępny w aktualnej organizacji UI. Przygotowano `2e8319a`: readonly backup z istniejącym DATABASE_DIRECT_URL oraz wyłącznie zagregowanym sprawdzeniem zgodności UUID klientów i auth.users w tym samym snapshot. Planowany workflow_dispatch backup.yml na `ai/audit-sync-outbox`, bez mutacji/restore produkcji, na podstawie AUDIT-20260930. Ten branchowy artefakt nie zastępuje zaufanego backupu main wymaganego przed migracją.
- Wynik preflight: [backup 36950568443 SUCCESS](https://github.com/Cool-Ass/CoolInk/actions/runs/36950568443), 2026-10-02 01:23 UTC, `2e8319a`. W bazie źródłowej 32 Auth users; wszystkie 22 powiązane profile CRM mają zgodny UUID w auth.users. Zweryfikowano 10 obiektów mediów. Artefakt `11204301306`, sha256 zip `303524c3217751cde293a568c6d1e3e73e32e361b451552bb99022304c230148`. Dump nadal public-only, nie jest pełnym odtworzeniem Auth/config.
- Nowa granica uprawnień: klucze MFA/Google zapisane jako nieodczytywalne Secret Vercel, brak ich w obecnym backupie. Pełne A01 wymaga uzgodnionego zaszyfrowanego escrow bieżących wartości (bez rotacji), nie dodano endpointu eksportującego sekrety ani nie ujawniono wartości. Prośba o zgodę na ten rozszerzony mechanizm w bieżącym czacie.

Repo zawiera Next.js/React, Prisma/PostgreSQL, panel admina, PWA klienta,
rezerwacje, prywatne media i integrację Google Calendar. Źródła:
[README](../../README.md), [package.json](../../package.json).
Nie zmieniono logiki aplikacji, workflow ani ustawień hostingu.
Istniejący [vercel.json](../../vercel.json) uruchamia migracje przed buildem
przez [migrateDeploy.mjs](../../scripts/migrateDeploy.mjs). To wymaga sprawdzenia
backup gate i pending migrations przed przyszłą promocją aplikacji; sam plik
nie potwierdza aktualnej konfiguracji automatycznych deployów hostingu.

## Mapa pamięci

- [BACKLOG](BACKLOG.md): priorytety, właściciel zadania, kryteria odbioru.
- [DECISIONS](DECISIONS.md): ADR, zgody i ich ograniczenia.
- [RELEASE_LOG](RELEASE_LOG.md): zmiany, dowody, wdrożenia i rollback.
- [WEEKLY_AUDIT](WEEKLY_AUDIT.md): kontrola operacyjna i terminy.
- [MARKET_WATCH](MARKET_WATCH.md): źródła i hipotezy rozwoju.
- [INCIDENTS](INCIDENTS.md): incydenty, działania i wnioski.

## Cykl i wznowienie

1. Fetch main; odczytaj zasady, checkpoint, backlog, decyzje, ostatnie wydania
   i otwarte incydenty. Sprawdź otwarte PR i przebiegi zanim powtórzysz operację.
2. Jeden aktywny Worker na repo. Scheduler musi zapewnić mutex/concurrency;
   wpis w Markdown sam nie jest blokadą. Bez potwierdzonej wyłączności nie
   wykonuj mutacji. Zapisz run ID, zadanie, branch, SHA, czas UTC, lease (do 60 min),
   ostatnią zakończoną operację, dowody i następny krok w tym checkpointcie.
   Odświeżaj lease przed wygaśnięciem. Wygasły lease wymaga najpierw sprawdzenia,
   czy poprzedni proces/PR/deploy nadal działa; nie przejmuj go w ciemno.
3. Wybierz najwyższy wykonalny priorytet, utwórz branch `ai/*`, określ ryzyko
   i kryteria odbioru. Zapisz WORKING. Incydent ma pierwszeństwo.
4. Wykonaj małą zmianę, przejdź do VERIFYING, zbierz wyniki na tym samym SHA.
   Nowy commit unieważnia wcześniejsze wyniki dla promocji.
5. LOW może być promowany po bramkach. MEDIUM/HIGH przechodzi do
   WAITING_APPROVAL z konkretnym PR, skutkami i planem wycofania.
6. Po zakończeniu zapisz wynik, backlog, decyzje/release i następny krok; IDLE.
   Przy przerwaniu zachowaj checkpoint w zdalnym branchu/PR. Po wznowieniu
   porównaj go z rzeczywistym stanem GitHub/hostingu, nie powtarzaj deployu ślepo.

| Status | Znaczenie / wyjście |
|---|---|
| IDLE | Brak pracy w toku; wybór zadania → WORKING |
| WORKING | Implementacja → VERIFYING, BLOCKED lub WAITING_APPROVAL |
| VERIFYING | Walidacja; błąd → WORKING/BLOCKED; sukces i wymagane zgody → publikacja, potem IDLE |
| WAITING_APPROVAL | Zapisana prośba o zgodę; zgoda na zakres/SHA → WORKING lub VERIFYING |
| BLOCKED | Brak dostępu, dowodu lub zależności; zapisz powód i warunek odblokowania |
| INCIDENT | Potwierdzona awaria/ryzyko dla produkcji; procedura incydentu, następnie VERIFYING i IDLE |

## Walidacja i promocja

Istniejący [Quality and security](../../.github/workflows/security.yml) obejmuje
`npm ci`, audit high/critical produkcyjnych zależności, lint, typecheck, Vitest,
build, gitleaks, CodeQL, izolowane RLS/IDOR/role oraz HTTP smoke admina i klienta.
Wymaga sekretów `DRY_RUN_*`; ich brak jest błędem, nie pominięciem.
Przed uruchomieniem testów sprawdź skrypty i izolację ich docelowej bazy.

E2E przed promocją musi dodatkowo potwierdzić w odizolowanym środowisku:
logowanie/wylogowanie i role; rezerwację oraz anulowanie; odrzucenie rezerwacji
archiwalnego projektu; draft/publikację CMS; dostęp do mediów; Google Calendar
bez uprawnienia; krytyczną ścieżkę klienta na mobile. Zapisz scenariusz, środowisko,
SHA, wynik i artefakt. Istniejące HTTP smoke nie dowodzą pełnego browser E2E;
w package.json nie ma osobnej komendy browser E2E. Luka blokuje auto-deploy.

Przed promocją sprawdź aktualny main, reguły branchy, wymagane checks, zgody,
target hostingu i przypisanie artefaktu do SHA. Jeśli hosting publikuje main
przed CI, najpierw uzgodnij i wdroż bramkę w osobnym zatwierdzonym zadaniu.
Nie omijaj ochrony branchy ani nie używaj force-push.

Dokumentację waliduj lokalnie przez diff/whitespace, kompletność, linki względne
i zgodność odwołań z repo. Pełny build lokalny nie jest konieczny dla samych
plików Markdown; nie zwalnia to automatycznej promocji aplikacji z bramek.

## Backup gate przed zmianami danych

1. Określ dane, środowisko, zmianę, utratę dopuszczalną przez właściciela i plan
   odtworzenia; uzyskaj zgodę HIGH RISK. Zidentyfikuj bazę i wszystkie magazyny.
2. Wymagaj udanego świeżego backupu sprzed operacji (maks. 24 h; przy migracji
   lub usuwaniu wykonaj backup bezpośrednio przed zmianą). Zapisz run URL,
   czas, środowisko, identyfikator artefaktu i sumę, bez sekretów/dumpa w repo.
3. Potwierdź dostęp do zaszyfrowanego artefaktu i klucza oraz możliwość odczytu,
   zgodność tabel CoolInk, kompletność mediów i aktualny udany restore drill
   (maks. 90 dni oraz ponownie po zmianie formatu/schema/toolingu).
4. Przy aktywnych zapisach zapewnij zatwierdzony spójny snapshot/quiescence;
   sam dump i osobno policzone rekordy nie dowodzą spójności punktu w czasie.
5. Brak któregokolwiek dowodu → BLOCKED. Nie odtwarzaj danych na produkcję bez
   osobnej zgody obejmującej utratę zapisów od czasu backupu.

Źródła: [backup](../../.github/workflows/backup.yml),
[restore drill](../../.github/workflows/restore-drill.yml). Backup ma harmonogram
codzienny 03:23 UTC i retencję artefaktu 90 dni; restore kwartalny 04:41 UTC
1 stycznia/kwietnia/lipca/października. Harmonogram nie jest dowodem sukcesu.

## Production smoke i rollback

Po promocji zapisz deployment ID/URL, SHA, poprzedni dobry deployment i czas UTC.
Sprawdź stronę główną, publiczną podstronę CMS, logowanie admina/klienta,
odmowę dostępu niezalogowanemu do chronionych zasobów i ładowanie mediów.
Obserwuj błędy/5xx przez co najmniej 15 minut wobec baseline. Nie uruchamiaj
skryptów tworzących fixture na produkcji; mutujące smoke wymagają odrębnie
zatwierdzonego konta testowego i planu sprzątania. Brak dostępu do monitoringu
oznacza niezweryfikowane wdrożenie, nie sukces.

Nowe 5xx, naruszenie dostępu lub niedziałająca krytyczna ścieżka → INCIDENT,
zatrzymanie kolejnych deployów i powrót do poprzedniego sprawdzonego artefaktu
zatwierdzoną procedurą hostingu. Wcześniej sprawdź zgodność kodu ze schematem.
Jeśli brak bezpiecznego planu, eskaluj do właściciela zamiast improwizować.
Po rollbacku ponów smoke i zapisz rezultat w RELEASE_LOG oraz INCIDENTS.
