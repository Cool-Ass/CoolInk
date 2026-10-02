# CoolInk Autopilot v1 — pamięć i runbook

Zasady nadrzędne: [AUTOPILOT_RULES](../../AUTOPILOT_RULES.md).

## Checkpoint startowy — 2026-09-30

| Pole | Stan |
|---|---|
| Status | VERIFYING — A01 runtime configuration bootstrap |
| Aktywne zadanie / run / lease | Jeden Worker potwierdzony list_threads; ai/audit-runtime-key-bootstrap / PR #28; checkpoint 2026-10-02 11:49 UTC, lease do 12:26 UTC. Pakiet UI i aplikacji zachowany w PR #26 / 6e8587c. |
| Zbadana baza main | `f310ca146435685d5c6d412e3c38527c608318d1`, tooling-only PR #27 merged po 37001049836 SUCCESS; main CI 37001930588 SUCCESS |
| Następny krok | Świeży main backup 37001930017 i offline restore 37002286826 SUCCESS (public/auth/storage/media). PR #28: domyślnie wyłączony endpoint OIDC key-bound + capture/verify CLI i opcjonalny workflow. 13 testów granic PASS; 52a30a9 CI SUCCESS, najnowszy SHA wymaga własnych checks. Następnie staged production capture i nowy drill; A01 runtime/login, A10/A14 pozostają otwarte. |
| Auto-deploy gotowy | Auto-assign Custom Production Domains Disabled ponownie potwierdzone UI. Produkcyjna flaga BACKUP_CONFIG_ESCROW_ENABLED=1 zapisana dla przyszłego buildu; obecna strona nie ma endpointu. Bez rotacji kluczy, migracji ani promocji domeny w bootstrapie. |
| Scheduler co 5 godzin | Wspomniany w przekazanym kontekście, niezweryfikowany w tej sesji; nie utworzono ani nie zmieniono harmonogramu |

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
