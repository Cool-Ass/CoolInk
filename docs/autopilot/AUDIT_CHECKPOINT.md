# Audyt — checkpoint 2026-10-01 (Europe/Warsaw)

## Recovery update — 2026-10-02 16:44 UTC

Follow-up 16:56 UTC: **37037086568 SUCCESS** / `99013ac` restores saved main
backup 37035132250. Actual production Next HTTP: MFA challenge, wrong-code
rejection, successful login, authenticated MFA settings GET and revocation
all PASS with a synthetic fixture MFA seed encrypted using the recovered key.
Source has one stored MFA ciphertext but no enabled MFA account matched by
the first HTTP selector. This is not proof of enabled MFA on the source admin.
The revised selector also clones pending setup ciphertext into the disposable
fixture, and reports original mfaEnabled separately without altering it.
One original Google token decrypts; recovered session and media signing keys
PASS. Database/protected counts, 10 media bytes and isolated GoTrue password
flow also PASS. No original account password changed, no provider calls,
no customer bodies/logs/artifacts exposed. Earlier HTTP test 37036521558 FAIL
used an endpoint without a GET handler; corrected to actual MFA GET.

Exact final app CI 37037022125 / `99013ac` pending behind existing running
isolated database worker; no running job cancelled. A01 still requires
client application login/private-media HTTP serving proof, A14 production
monitor execution/delivery evidence. A10 needs owner retention/execution
decision: asynchronous question submitted, not answered yet. No source DB
deletion, migration or public-domain promotion. Next worker must preserve
this gate rather than interpreting a staged Ready build as public deployment.

Follow-up 16:49 UTC: restore **37036011914 SUCCESS** / `c076cb4`, same
trusted saved main artifact. Actual restored crypto records: 1 MFA secret,
1 Google token, 0 revoked connections, 0 reviews credentials; media ownership
signatures and sessions PASS with recovered keys. This does not yet prove
full application HTTP/private-media serving. Prepared additional real Next
production HTTP admin login/MFA/session-revocation drill: disposable local DB
only, cloned ciphertext in a new ephemeral fixture, no original account
password changes, suppressed application logs, local-fetch-only child.
Obsolete pending CI 37036016375 cancelled before startup; never cancelled a
running isolated database worker. Public domain not promoted.

- PR #32 exact `a4fcc11` CI 37016684344 and all checks/status SUCCESS;
  recovery-only merge `eb6ff76`. Staged production deployment
  `cool-m49mvi8je-cool-ass.vercel.app` Ready, domains assignment Skipped.
- Trusted main backup **37035132250 SUCCESS**: approved current runtime keys
  sealed without rotation, immutable repository-ID subject matched. Artifact
  `11239885068`, zip SHA256
  `13fdaec470590aa7658e83d49fb19053a8a7e75a847b40f847acb893b1d23d4b`.
- Restore **37035385350** from this saved artifact: database counts, protected
  Auth/storage counts, media bytes, actual GoTrue password flow and offline
  configuration envelope all PASS. Additional TypeScript crypto entry failed
  before execution: esbuild TransformError, top-level await emitted as CJS at
  `verifyRestoredCrypto.ts:81`. No evidence of a broken key or database change.
  Fix removes top-level await and asynchronously imports the independent ESM
  CLI; real tsx guard regression + existing crypto and age tests: 7 PASS.
- Prepared hourly recovery metadata monitor with deduplicated durable issue,
  backup 36h / quarterly drill 100d limits, missing artifact and failed run
  alarms. Not deployed and no owner delivery/read receipt claimed.
- A01 full application HTTP/MFA/private-media-serving recovery, A10 complete
  privacy handling/retention and A14 actual notification receipt remain open.
  Public domains remain on the earlier release; no migration/promotion.

## Dowody

- PR 18 wdrożony do main `ed85fb8`: wspólny snapshot dumpa i liczników,
  odtwarzanie zapisanego artefaktu, nie nowo utworzonej kopii.
- Backup produkcyjny [36759327990](https://github.com/Cool-Ass/CoolInk/actions/runs/36759327990): success.
- Odtworzenie tej kopii w izolacji [36759519389](https://github.com/Cool-Ass/CoolInk/actions/runs/36759519389): success.
  Nie dowodzi odtworzenia Supabase Auth, konfiguracji i możliwości logowania po katastrofie; A01 nadal częściowo otwarte.
- PR 19 `d204896`: [CI success](https://github.com/Cool-Ass/CoolInk/actions/runs/36760116775).
- PR 20 `0050947`: [CI success](https://github.com/Cool-Ass/CoolInk/actions/runs/36760188437).
- PR 21 `b0ad3a4`: [CI success](https://github.com/Cool-Ass/CoolInk/actions/runs/36760642337).
- Żaden z PR 19–21 nie został scalony ani wdrożony na produkcję.

## Aktywny pakiet AP-001/A13

- Branch `ai/audit-browser-gate`, bazuje na PR 21. Ryzyko MEDIUM: testy i CI,
  brak zmian schematu, wyłącznie jednorazowe fixture w bazie testowej.
- Playwright: klient desktop/mobile — logowanie, własny projekt, odmowa admin API,
  wylogowanie; admin desktop — logowanie, karta klienta, blokada edycji loginu, wylogowanie.
- Brak trace/video i utrwalania sesji w raportach; sprzątanie tylko dokładnych fixture.
- Wzmocnienie allowlisty hosta i identyfikatora testowego zamiast startsWith/includes.
- Kryterium odbioru: faktyczny success przeglądarki w izolowanym CI, bez skipów/retry;
  lokalne testy granic izolacji oraz lint/typy.
- Rollback: revert pakietu testowego, bez restore i kasowania danych produkcyjnych.
- CI `36792333972`, SHA `89c8046`: success. Rezerwacja z wersjonowaną zgodą,
  anulowanie i etykiety ZAJĘTY/NIEDOSTĘPNY przeszły na desktop i mobile.
- Kolejny pakiet dodaje draft/publikację/cofnięcie CMS, odmowę dla roli artist
  oraz próbę rezerwacji archiwalnego projektu. Media nadal wymagają testu UI.
- API ochrony main zwróciło 404: nie potwierdzono ochrony ani bramki hostingu.
  Nie traktować zielonych HTTP smoke jako pełnego browser E2E lub zgody na ominięcie bramek.

## Nadal otwarte

Aktualizacja: pierwsze CI browser `36785496471` potwierdziło oba scenariusze desktop.
Mobile dotarł do wylogowania, lecz test nie otwierał menu „WIĘCEJ” — poprawiono
interakcję zgodnie z istniejącym UI, bez omijania wylogowania.
Dodatkowo zgłoszenie właściciela ze screenów: zachowanie statusu ręcznego
„ZAJĘTY” w publicznym payloadzie jako enum, bez ujawniania powodu/notatek.
Wspólny serializer obejmuje stronę publiczną, portal i starszy ekran /app/terminy.
Siedem testów jednostkowych statusów przeszło; dodano sprawdzenie etykiet w browser E2E.

A01 pełne DR/Auth/konfiguracja; A09 outbox/idempotencja; A10 obsługa wniosków i retencja;
A12 korekty płatności; A13 pełne E2E; A14 monitoring; A16 dokumentacja/aktualizacje;
A17 polling. A06–A08 i A11 mają przygotowane poprawki, lecz nie status produkcyjnie zamknięte.

## Pakiet A17 — czat

Branch `ai/audit-chat-polling`, bazuje na PR 22. Brak migracji; ryzyko MEDIUM.
Odświeżanie po zakończeniu poprzedniego zapytania, co 10 sekund; zatrzymanie
w ukrytej karcie/offline, natychmiastowe wznowienie, backoff błędów do 60 sekund,
deadline 20 sekund i abort po opuszczeniu widoku. Wysyłanie nadal aktualizuje UI od razu.
Trzy testy granic cyklu zapytań przeszły. Rollback: revert pakietu bez zmian danych.

Pakiet obejmuje również A16 (opis PostgreSQL i codziennego backupu w README)
oraz ostatni scenariusz A13: upload inspiracji przez rzeczywisty formularz,
odczyt właściciela i odmowa anonimowego odczytu. Sprzątanie usuwa dokładne pliki
jednorazowego właściciela z testowego Storage przez API, przed usunięciem Auth;
chwilowa polityka DELETE ograniczona do jego UUID jest usuwana w finally.
Wynik browser dla tego rozszerzenia nadal oczekuje na CI.

## Pakiet A12 — wycofane rozliczenia

Branch `ai/audit-payment-corrections`, bazuje na PR 24. Brak migracji.
Wpisy visit z voidedAt, bez audytowanego wyjaśnienia, trafiają do pilnych zadań
admina z finance.manage. Karta klienta pokazuje oddzielną kolejkę, niezależnie
od limitu 30 wpisów historii. Zapis wyjaśnienia wymaga powodu, poprawnego klienta
i wycofanego wpisu; działa pod istniejącą blokadą transakcyjną i zapisuje audyt.
Nie zmienia kwot, pieczątek ani wycofanych zapisów. Replay nie tworzy duplikatu.
21 testów route, TypeScript i lint przeszły. Rollback: revert kodu; audyt zachować.

## Pakiet A09 — transakcyjny eksport Google

Branch `ai/audit-sync-outbox` integruje PR 19–25. Migracja HIGH RISK dodaje
trigger Appointment, zapisujący marker w istniejącym prywatnym SiteSetting
w tej samej transakcji. Claim SQL jest wyłączny, lease wygasa po 2 minutach;
nowa mutacja zachowuje aktywny lease, a stary worker nie usuwa nowego zadania.
Retry zachowuje nonce kolejki; Google event ID opiera się na trwałej poprzedniej
tożsamości zdalnego wpisu, nie na zmieniającym się nonce mutacji. Zapobiega to
duplikacji także przy zmianie wizyty po utracie zapisu powiązania w bazie.
HTTP 409 odzyskuje istniejący obiekt dopiero po sprawdzeniu zakresu czasu;
zmiana/usunięcie po stronie Google pozostaje konfliktem. Manual sync używa
tego samego claim zamiast równoległego eksportu. Wywołania Google mają limit 15 s.
14 testów jednostkowych integracji, TypeScript i lint przeszły.
CI zawiera nowy izolowany test rollbacku triggera, równoległych claims,
starego potwierdzenia i odzyskania lease; jego wynik jeszcze niepotwierdzony.
Produkcja: przed migracją obowiązuje świeży backup gate. Rollback kodu nie wymaga
kasowania kolejki; trigger/markery można zachować do ponowienia eksportu.
Specyfikacja ID: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
