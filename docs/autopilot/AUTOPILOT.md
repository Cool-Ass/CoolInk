# CoolInk Autopilot v1 — pamięć i runbook

Zasady nadrzędne: [AUTOPILOT_RULES](../../AUTOPILOT_RULES.md).

## Aktualny checkpoint — 2026-10-06 22:04 UTC / 2026-10-07 00:04 CEST

- VERIFYING od22:05UTC, jeden root Worker, lease do23:00UTC. Właściciel
  zatwierdził „tak” oba pakiety i sharp0.35.5 po pełnych testach; dowód
  https://github.com/Cool-Ass/CoolInk/pull/43#issuecomment-6026311085.
- PR42 c6f33ab włączony do PR43, jeden finalny head/main cykl, jedna promocja.
  Stary PR42 zamknąć jako zastąpiony dopiero po sukcesie rollup.
- Minimalny sharp0.35.4→0.35.5 plus jego @img/libvips; npm production audit0,
  bez audit fix --force lub szerokiej aktualizacji. Produkcja nadalfe857c0.

- WAITING_APPROVAL, jeden root Worker ai/announcement-rich-content, lease
  zwolniony przed oczekiwaniem na właściciela. ANNOUNCEMENT-RICH-20261007 MEDIUM.
- Zlecenie: różne formatowania, emoji i obrazy w komunikatach. Text-only markup
  bez HTML execution,32 emoji,4 publiczne media z opisami, upload/picker/preview.
  Backend sprawdza Media, retry obejmuje format/obrazy; żadnej zmiany auth/upload/RLS.
- Typecheck i targeted lint PASS,11 announcement unit tests PASS, node check
  browser spec PASS. Dodana E2E desktop/mobile regresja format/emoji/upload/render,
  jeszcze niewykonana. Nie twierdzić, że cały E2E przeszedł.
- Publikację blokuje GHSA-wq5f-xc86-pv6w sharp0.35.4; minimalny patch0.35.5
  poza zakresem poprzedniej zgody. Wymagane zatwierdzenie rozszerzonego pakietu,
  osobny PR, pełne exact-head/main gates i ręczna promocja.
- PR42 c6f33ab: kółka pieczątek przy nazwie, lokalne types/lint PASS; CI37537167381
  backup/codeql PASS, verify FAIL na sharp audit. Brak merge lub promocji.
- Produkcja PR41 fe857c0/GFN7yZMAwGvcyxa47o61kYAu94kH, promocja07:44UTC,
  smoke07:44:22/08:00:19UTC i ponad15min obserwacji PASS. Dowody PR41
  https://github.com/Cool-Ass/CoolInk/pull/41#issuecomment-6012028861,
  docs-only commit27a4992, ai/release-pr41-evidence. Nie publikować evidence SHA.
- Rollbackfe857c0 bez restore, bez produkcyjnych kampanii testowych. Stary kod
  pokazuje rich znaczniki jako tekst i nie obrazy: wyłączyć nowe komunikaty
  przed ewentualnym rollbackiem. Docelowo brak zmiany zasad płatności/pieczątek.

## Historyczny checkpoint — 2026-10-06 06:55 UTC / 08:55 CEST

- FIXING, jeden root Worker ai/client-announcements, lease do07:50UTC.
- Właściciel zatwierdził PR41 w czacie: „Zatwierdzam”. Publikacja po testach.
- CI37423946945: CodeQL/backup PASS; verify wykrył503 przy publikacji silent
  w nowej browser regresji. Nie scalono ani nie promowano niesprawnego pakietu.
- Zdiagnozować transakcję publikacji, poprawić bez rozszerzenia zakresu, ponowić
  exact-head gates. Produkcja nadalad434aa.
- c18468e/CI37426601486: silent publikacja i persistent dismiss PASS; techniczny
  page.request dostał401 poza browserowym transportem ciasteczek sesji. Test fan-out
  i disable używa teraz browser fetch jak UI, bez zmiany auth lub asercji.
- 7af2fc4/CI37427861146: nowe komunikaty/CMS desktop i mobile PASS (5/6
  scenariuszy), istniejący test mobile Escape wysłał klawisz przed rAF autofocus
  popoveru. Dodano oczekiwanie na focus dialogu przed Escape; zachowano asercję
  przywrócenia focusu. Bez zmian buildera. Nowy exact-head CI wymagany.

## Historyczny checkpoint — 2026-10-06 06:35 UTC / 08:35 CEST

- WAITING_APPROVAL, PR41 https://github.com/Cool-Ass/CoolInk/pull/41.
- Exact-head7385b7846e4e7b248a9d5958aa8d7ef1221a8c4a; CI37423946945 trwa
  (verify/typecheck, CodeQL analyze, backup concurrent writes). Vercel primary
  pending, pomocniczy success. Nie jest to jeszcze wynik wszystkich bramek.
- Poprzedni CI37423741671 zatrzymał się na npm audit; source-map-js1.2.2
  naprawia advisory. Zero production lock audit; pozostałe zależności bez zmian.
- Zgoda w czacie poproszona na komunikaty i spójność CMS; zakres obejmuje też
  wymagany minimalny security patch opisany w PR komentarzu6010716930.
- Brak merge/promocji PR41; produkcja nadalad434aa. Nie wysłano komunikatów
  do realnych klientów. Lease zwolniony podczas oczekiwania na właściciela.
- Następny krok: decyzja właściciela + wszystkie exact-head checks, normalmerge,
  wszystkie exact-main checks, ręczna promocja, readonly smoke i15min obserwacji.
- Ten lokalny checkpoint jest własną zmianą dokumentacyjną, jeszcze bez commita;
  nie generować nowego SHA aplikacji tylko po to, by zapisać status CI.

## Historyczny checkpoint — 2026-10-06 06:29 UTC / 08:29 CEST

- VERIFYING, ai/client-announcements, jeden root Worker, lease do07:12UTC.
- MEDIUM: nowe komunikaty (silent/dzwonek, expiry, dismiss, disable, UUID retry)
  oraz wspólna prezentacja Pages/Portfolio/Media i formularzy CMS.
- Brak migracji, rozszerzenia RBAC, wysyłek zewnętrznych lub zmian płatności.
  Limity100 komunikatów/5000 dzwonków; istniejący privacy cleanup usuwa markery.
- 10 ukierunkowanych testów PASS; typecheck i lint zmienionego zakresu PASS.
  Nowe izolowane browser regresje desktop/mobile czekają na exact CI.
- CI37423741671 zatrzymany na nowym advisory GHSA-68fv-2mgg-jv7q:
  source-map-js1.2.1. Minimalny lockfile patch do1.2.2; production lock audit0.
  Bez force update lub obniżenia bramek. Nowy exact SHA wymaga wszystkich checks.
- PR40 zakończony; nowy zakres wymaga osobnego PR i zgody właściciela przed
  merge/promocją. Rollbackad434aa/8BydWbL4snRywt6f1fjkEvBTAScW bez restore.

## Historyczny checkpoint — 2026-10-06 06:12 UTC / 08:12 CEST

- PR40 DONE: końcowy readonly smoke home/app/admin-login200, chronione API401.
- Obserwacja została przerwana po pierwszym smoke i wznowiona rano; nie jest
  to ciągły monitoring nocy. Świeże Production Last15min 05:56–06:11UTC:
  Error0%/Timeout0%. Produkcyjny deployment ad434aa pozostaje bez zmian.
- Nowy zakres MEDIUM: komunikaty admina w panelu klienta (opcjonalny dzwonek,
  zamknięcie przez klienta i wyłączenie przez admina) oraz spójność Pages,
  Portfolio i Media z istniejącymi tokenami studio. Bez wysyłania kampanii.
- Jeden root Worker; lease do07:12UTC. Osobny PR, zgoda przed publikacją.

## Historyczny checkpoint — 2026-10-06 00:58 UTC / 02:58 CEST

- OBSERVING, jeden root Worker, ai/release-pr40-evidence, lease do01:18UTC.
- PR40 scalony po zatwierdzeniu rozszerzonego zakresu przez właściciela:
  https://github.com/Cool-Ass/CoolInk/pull/40#issuecomment-6006361951.
- Exact-head9b44b46 CI37394486798 i exact-mainad434aa CI37395584488 SUCCESS:
  verify/E2E/security/backup; Vercel obu projektów SUCCESS.
- Ręczna promocja00:56:43UTC, Vercel8BydWbL4snRywt6f1fjkEvBTAScW,
  cool-o7basf33p-cool-ass.vercel.app, www.coolinktattoo.pl / cool-ink.vercel.app.
- Start smoke/obserwacji00:57:09UTC. Home/app/admin-login200, chronione API401.
  Auto-assign Custom Production Domains nadal Disabled. Bez fixture produkcyjnych.
- Rollback8a9431e/fLYEoVMDMxwLS9B7iDeRuSJDdJAX bez restore. Następny krok:
  minimum15min obserwacji, końcowy smoke i zamknięcie RELEASE_LOG.
- Po wdrożeniu właściciel zlecił „zajmij się powiadomieniem”; brak jednoznacznego
  wskazania rodzaju/usterki. Pytanie w czacie, nie zmieniać niczego na domysł.

## Historyczny checkpoint — 2026-10-06 00:23 UTC / 02:23 CEST

- VERIFYING, jeden root Worker ai/text-effects-group, lease do01:18UTC.
- PR40 rozszerzony na żądanie właściciela: obraz jako nakładka tła oraz
  przezroczyste tło widgetu Obraz. MEDIUM, zgoda przed merge/publikacją wymagana.
- Nakładka wspólna dla widgetów/kolumn/sekcji, obraz + kolor, krycie, fit,
  pozycja i repeat; nie zasłania interakcji ani nie zmienia krycia treści.
- Upload już zachowuje alpha; test rzeczywistych pikseli PNG/WebP PASS.
  Usunięto wymuszony charcoal z ramki wczytanego obrazu; placeholder bez zmian.
- 13 ukierunkowanych testów PASS, typecheck i lint bez błędów. Browser regresje
  obejmują overlay w canvasie/public i przezroczystą ramkę. Nowe exact CI wymagane;
  wcześniejsze CI37391982666 SUCCESS dotyczy wyłącznie afc347c, nie nowego zakresu.
- Produkcja nadal8a9431e/fLYEoVMDMxwLS9B7iDeRuSJDdJAX, ten sam rollback bez restore.

## Historyczny checkpoint — 2026-10-06 00:03 UTC / 02:03 CEST

- VERIFYING, jeden root Worker, ai/text-effects-group, lease do00:58UTC.
- TEXT-GROUP-20261006, LOW: właściciel wskazał błędny osobny wiersz
  „Obrys i cień tekstu” i zlecił poprawkę. Przeniesiono go do istniejącego
  PanelSection Tekst bez zmiany wartości, stylowania ani mechanizmu popoverów.
- Dodano browser regresję rodzica, zwijania, otwierania i Escape/focus.
  Lint zmienionych plików i typecheck PASS. Exact CI/E2E/security obowiązkowe.
- Publiczny8a9431e/fLYEoVMDMxwLS9B7iDeRuSJDdJAX pozostaje bez zmian.
  Rollback tego UI-only pakietu: ten sam deployment, bez restore danych.
- Włączono wyłącznie dowodową dokumentację poprzedniego wydania PR39
  z osobnego brancha; nie ponawiać jego publikacji/testów jako nowego zadania.
- Następny krok: PR poprawki, exact checks, normal merge i ręczna promocja.

## Zakończony checkpoint — 2026-10-06 01:54 CEST / 2026-10-05 23:54 UTC

- IDLE, PR39 opublikowany i zweryfikowany; lease zwolniony, bez drugiego Workera.
- PR39 scalony po zgodzie właściciela i CI37367158121 attempt2 SUCCESS.
- Exact-main `8a9431ed9d26cb285f38fb47393d2e708092d47d`, CI37388586456
  SUCCESS: verify/E2E, gitleaks, CodeQL i backup-snapshot.
- Vercel `fLYEoVMDMxwLS9B7iDeRuSJDdJAX`, `cool-d1658zr1e-cool-ass.vercel.app`,
  promocja 2026-10-05 23:37:35 UTC na www.coolinktattoo.pl / cool-ink.vercel.app.
- Readonly smoke: home, klient, admin/login, terminy HTTP200; chronione API
  kalendarza i ustawień lojalności HTTP401 bez sesji. Error Rate0%.
- Auto-assign Custom Production Domains nadal Disabled po promocji.
- Brak migracji, produkcyjnych fixture, zmian zasad płatności lub uprawnień.
- Obserwacja PASS,23:38:30–23:54:07UTC, ponad15min; Production Error0%/Timeout0%,
  końcowy readonly smoke PASS. Kalendarz istniejącej sesji klienta i logo
  renderują się poprawnie; admin wymaga logowania, MFA nie omijano.
- Rollback202c8f1/CXSorzy7faJTyhSr2PNCPynFVXRS bez restore; niewykonany.
- Następny krok: rutynowy monitoring, bez ponownego wdrażania tego pakietu.
  Osobny dokumentacyjny branch ai/release-pr39-evidence nie jest SHA aplikacji.
- Dowody operacyjne: https://github.com/Cool-Ass/CoolInk/pull/39.

## Historyczny checkpoint — 2026-10-05 19:40 UTC

- VERIFYING, jeden root Worker, branch `ai/compact-controls-workflow`, lease do20:35UTC.
- Zakres nowego żądania właściciela: kompaktowy inspector całego buildera,
  prowadnice px/drag/kąt/duplikacja, sesje od najnowszej i wspólny ekran rozliczenia.
- MEDIUM: zmiany prezentacji/workflow. Bez zmian reguł finansowych, endpointów,
  schematu, uprawnień, produkcyjnych danych lub sekretów. Wdrożenie wymaga
  dokładnego SHA CI/E2E/security i ręcznej promocji; nie deklarowano publikacji.
- Bazowy publiczny main202c8f1. Dotychczasowy audyt pozostaje zakończony.
- PR39 zatwierdzony przez właściciela „Tak, opublikuj po testach”. Lokalne
  typecheck/lint i36 ukierunkowanych testów PASS. CI37365802883/37366246658
  oczekują na runner; nie anulować. Dokładna najnowsza wersja wymaga nowych checks.
- 20:00UTC: potwierdzona publiczna awaria przydzielania GitHub-hosted runnerów,
  https://www.githubstatus.com/ (incydent od19:11UTC). CodeQL pierwszego PR run
  SUCCESS, verify/backup-snapshot queued; nie pomijać bramek ani anulować izolacji.
- Edycja początku wizyty zachowuje jej dotychczasowy czas; edycja końca niezależna.
  Globalny motyw nie podmienia kolorów chrome inspektora (kontrast UI).
- Kalendarz: edycja dat/czasu w tym samym modalu i przejście do tej wizyty
  w rozliczeniach; URL otwiera wyłącznie formularz dla server-eligible wizyty,
  nie zatwierdza płatności/rabatu i nie rozszerza uprawnień.
- Main schedule37302779331: scanner wykrył synthetic SESSION_SECRET fixture
  tests/privateBlobUploads.test.ts:26/92d053a, nie produkcyjny sekret;
  nie zmieniano scanner policy ani kluczy. Nowe exact-SHA checks są obowiązkowe.
- Następny krok: exact CI/E2E/security PR39, merge po bramkach, staged main
  i ręczna promocja; nadal publiczny202c8f1, bez nowego wdrożenia.

## Zakończony checkpoint — 2026-10-03 10:00:19 UTC

| Pole | Stan |
|---|---|
| Status | IDLE — pakiet audytu opublikowany i zweryfikowany; poniższe checkpointy są historyczne |
| Worker / lease | Ten sam root Worker, ai/audit-recovery-proxy. Zadanie zakończone; lease zwolniony, bez drugiego Workera |
| Publiczna wersja | main202c8f122c9bf4422846fe4a8a0d909152477c79; VercelCXSorzy7faJTyhSr2PNCPynFVXRS, promocja09:44:42UTC na www.coolinktattoo.pl i cool-ink.vercel.app |
| Dowody | Exact-main CI37113405016, sealed backup37113478046, saved-artifact/private full restore37113647881, public recovery37114086817 i Google worker37114185152 SUCCESS; szczegóły w AUDIT_CHECKPOINT/RELEASE_LOG |
| Obserwacja | Ponad15min do10:00:19UTC, Production Error0%/Timeout0%, public smoke PASS; ręczny ZAJĘTY poprawny także u klienta |
| Następny krok | Rutynowy monitoring/backlog. Nie powtarzać zakończonych pakietów ani controlled alarm probe bez nowej reprodukcji. Brak rzeczywistej osoby wybranej do erasure; AI/social odroczone |
| Publikacja / rollback | Auto-assign Custom Production Domains Disabled ponownie potwierdzone po promocji. Kolejne wersje wymagają ręcznej promocji po testach. Zgodny rollback e370bd1/9HVf5Ank4G9bCbarKSEzXkGiANfk, nie restore bazy |
| Backup | BACKUP_RUNTIME_CONFIG=true, codzienna kopia obejmuje sealed runtime bez rotacji; CONFIG_ESCROW_DEPLOYMENT_URL nie ustawiono, więc canonical production endpoint |

## Historyczny checkpoint startowy — 2026-09-30

| Pole | Stan |
|---|---|
| Status | VERIFYING — PR26/37 merged; exact signed recovery proxy boundary correction, no public promotion |
| Aktywne zadanie / run / lease | Ten sam Worker; ai/audit-recovery-proxy, 2026-10-03 09:20 UTC, lease do 10:15 UTC. PR26/37 merged main9b2c4a0. Main e370bd1 CI37110618285 and full restore37111133653 SUCCESS. Monitor probe37112411773 reached application but proxy returned403: added exact verified recovery identity boundary plus regression. Vercel original Backup rule unchanged; separate Production-only recovery and Google rules pin immutable main subject and exact workflow_ref, no secrets/protection disable/paid plan. No public promotion/customer erasure. |
| Zbadana baza main | `eb6ff7637e0fa01681b5c1f774b8170a47e29286` / staged cool-m49mvi8je-cool-ass.vercel.app Ready, domains assignment Skipped. Trusted encrypted backup 37035132250 SUCCESS, includes current runtime keys without rotation. |
| Następny krok | 92d053a exact CI37097019891 SUCCESS; private project/chat HTTP restore37097029884 SUCCESS from trusted backup37093068451, original private refs0/fixtures documented. Branch readonly backup37097031422 SUCCESS:10 objects/3 stores, artifact11264383863,digest9cddee694d501f498a33631c39a89a2a0202afa66d71d35425a1e8e40738f93e. New Private/FRA1 store_rV1Oa03Q3jg8NzRm connected Production-only under PRIVATE_BLOB prefix; GitHub secret saved; public CMS/test stores unchanged, no paid plan. Next: finish A10 separately confirmed execution and verify A14 monitor/delivery. No main merge/domain promotion. Fresh trusted main backup required immediately before outbox migration. |
| Auto-deploy gotowy | Auto-assign Custom Production Domains Disabled. Bez rotacji kluczy, restore/usuwania produkcji lub promocji nowej aplikacji. |
| Scheduler co 5 godzin | Wspomniany w przekazanym kontekście, niezweryfikowany w tej sesji; nie utworzono ani nie zmieniono harmonogramu |

## Kontynuacja 2026-10-02 01:11 UTC

- 02:00 UTC: readonly preflight `backup.yml` na `ai/audit-sync-outbox` / `255564a`, zakres AUDIT-20260930 i CONFIG-ESCROW-20261002: osobny zaszyfrowany dump auth/storage + liczniki w tym samym snapshot. Nie jest escrow kluczy runtime i nie zamyka A01; żadnego restore produkcji. Planowane wywołanie workflow_dispatch; wynik zostanie zapisany po zakończeniu.
- Wynik: backup 36953435073 SUCCESS, artefakt 11205131031, sha256 zip 3ac696716677d83ad278128f50adbee53d2447adb8a9cb9ecbce62bfce98ac76, 2026-10-02 02:00:15 UTC. Planowane audit_preflight offline tego dokładnego run/SHA, bez produkcyjnych połączeń i bez osłabienia publikacji.
- Preflight restore 36953847856 FAIL (brak kompatybilnych ról/platformowych rozszerzeń w pustym PostgreSQL). Naprawa tworzy NOLOGIN/NOSUPERUSER role i standardowe rozszerzenia tylko w coolink_restore. [Restore 36954184397 SUCCESS](https://github.com/Cool-Ass/CoolInk/actions/runs/36954184397), 2fdc9e6: odczyt zapisanego zaszyfrowanego artefaktu, public + auth/storage i zgodność wszystkich liczników. To nie dowodzi logowania Auth, odzyskania konfiguracji runtime/kluczy ani uruchomienia aplikacji po DR; A01 pozostaje otwarte.
- UI 36953049714: desktop klient/admin i mobile klient PASS; mobile admin FAIL — Nawigator domyślnie otwarty zasłaniał bibliotekę. Naprawiono start zamknięty w 18e238c, dodano regresję braku overlay. Wspólny modal: poprawiony Shift+Tab i współdzielona blokada scrolla; lokalnie testy mechanizmu i hero PASS. Najnowszy dokładny SHA nadal wymaga pełnego CI/E2E; żadnej promocji.

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
