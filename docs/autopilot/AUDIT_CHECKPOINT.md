# Audyt — checkpoint 2026-10-01 (Europe/Warsaw)

## Aktualny wynik — 2026-10-03, publikacja 09:44:42 UTC

Ten wpis zastępuje historyczne statusy pending poniżej, nie ich dowody.
PR26/37/38 scalone; produkcyjny main `202c8f122c9bf4422846fe4a8a0d909152477c79`.
Vercel `CXSorzy7faJTyhSr2PNCPynFVXRS` / cool-dc2d49ddv-cool-ass.vercel.app
promowany ręcznie na www.coolinktattoo.pl i cool-ink.vercel.app po wszystkich
bramkach. Auto-przypisywanie domen pozostaje wyłączone.

- CI exact main [37113405016](https://github.com/Cool-Ass/CoolInk/actions/runs/37113405016)
  SUCCESS: 82 pliki/359 unit tests, lint/types/build/security, RLS/IDOR 39 tabel,
  SQL outbox/quarantine/execution races, role-aware HTTP, 4 desktop/mobile E2E.
  Odczyt czatu p95 w izolacji: desktop831ms/mobile707ms; nie pomiar produkcyjny.
- Zaufany backup main [37113478046](https://github.com/Cool-Ass/CoolInk/actions/runs/37113478046)
  SUCCESS: zgodny snapshot, Auth/storage, 10 obiektów mediów i bieżące klucze
  zaszyfrowane bez rotacji. Artefakt11271126320, SHA256 ZIP
  `c5c4649ee263553bbc115c20817df28ad83b091f701b39fd6e0a1a31067a1869`.
- Odtworzenie zapisanego artefaktu [37113647881](https://github.com/Cool-Ass/CoolInk/actions/runs/37113647881)
  SUCCESS dla tego samego SHA: zgodność danych/Auth, realny izolowany flow GoTrue,
  logowanie aplikacji klienta, odtworzone MFA/ciphertext, odrzucenie błędnego MFA,
  sesje, podpisy/ownership i prywatne zdjęcia projektu/czatu HTTP.
  32 odtworzone Auth users/22 zgodne powiązane profile; oryginalne prywatne refs0.
  HTTP media używają jednorazowych fixtures z odtworzonych bajtów; nie hasła klientów.
  Brak restore, fixtures, erasure lub czyszczenia danych na produkcji.
- A10: osobna ocena/retencja i potwierdzone wykonanie są wdrożone; blokady,
  backup gate, retry, zamrożenie i zachowanie finansów/zgód przeszły izolowane CI.
  Nie wybrano żadnej rzeczywistej osoby do usunięcia. Granica wcześniej
  pobranych/cache'owanych bajtów pozostaje jawnie opisana w PRIVATE_MEDIA_CACHE.md.
- A14: podpisany probe [37113476751](https://github.com/Cool-Ass/CoolInk/actions/runs/37113476751)
  zapisał raport właściciela (POST200,09:34:09UTC); failure oczekiwany tylko dla
  kontrolowanego alarmu. Follow-up37113514001 i publiczny37114086817 SUCCESS.
  To dowód trwałego zapisu, nie przeczytania/push/email. Osobne Production-only
  reguły Vercel pinują immutable main subject i dokładne workflow_ref; ochrona
  nie została wyłączona. BACKUP_RUNTIME_CONFIG=true utrwala klucze w codziennej kopii.
- A09: publiczny Google worker37114185152 SUCCESS, checked0/synced0;
  nie tworzono testowych wydarzeń ani danych klientów. Harmonogram istniejący.
- Publiczne smoke: home/CMS polityka prywatności/login admina/klienta200,
  niezalogowany admin API401, cron GET405; chronione strony przekierowują na login.
  W istniejącej zalogowanej sesji klienta portal i kalendarz działają,
  ręczne5/7/12/15/20/21/26 października pokazują ZAJĘTY, niedziele NIEDOSTĘPNY;
  logo załadowane. Zachowano ustawiony przez właściciela tryb budowy strony głównej.
- Obserwacja po publikacji: PASS,09:44:42–10:00:19UTC (ponad15min),
  Vercel Production Error0%/Timeout0%; public smoke i brak regresji krytycznych.
  To okno obserwacji, nie gwarancja braku przyszłych awarii.
  Pakiet audytu opublikowany; rzeczywiste wnioski privacy nadal wymagają
  osobnego wyboru/oceny właściciela, AI/social pozostają odroczone.
- Rollback kodu: przetestowany, zgodny ze schematem/private-store e370bd1,
  deployment9HVf5Ank4G9bCbarKSEzXkGiANfk. Nie przywracać starszego ed85fb8
  bez sprawdzenia odczytu nowego private Blob; rollback nie jest restore danych.


## A10/A14 — 2026-10-03 05:18 UTC, przed nowym CI

- Ten sam Worker, PR26/ai/audit-sync-outbox. Właściciel potwierdził dalszą
  realizację i zgody zakresu audytu (AUDIT-FINAL-20261003); nie wybierano
  rzeczywistych klientów do usunięcia.
- A10 przygotowane: osobne potwierdzenie właściciela + revision CAS,
  świeży main backup/artifact i późniejszy matching-SHA restore; atomowe
  zamrożenie profilu, trigger obejmujący powiązane dane, RLS Storage
  odrzucające nadal ważne JWT zamkniętego konta, retry z dziennikiem.
  Dane finansowe i podpisane zgody pozostają wraz z identyfikacją
  podczas retencji; po jej wygaśnięciu wymagana nowa ocena/wykonanie.
  Wpisy z przyszłymi wizytami, Google links/exportami lub ponad100 plików
  są blokowane zamiast pomijać zewnętrzne kopie.
- Przesyłanie zdjęć dzieli blokadę z wykonaniem prywatności.
  SAVEPOINT pozwala sprzątać tylko nowo utworzone obiekty po błędzie DB,
  nie tracąc blokady; failed cleanup zapisuje prywatny marker do retry.
- A14 przygotowane: recovery-health.yml podpisuje raport GitHub OIDC
  exact-main-workflow; endpoint odrzuca cookies/origin/preview/replay.
  Zapis w panelu właściciela jest trwały mimo braku push. Brak aktualnego
  raportu przez2h jest alarmem; błędy przypomnień zachowane w audycie.
  To nie potwierdza przeczytania alarmu ani realnej dostawy produkcyjnej.
- Lokalnie typy/353 unit tests PASS; lint bez nowych błędów.
  Izolowany test SQL dodano do CI: client/project/media/chat/financial
  quarantine, upload vs execution race, executor with fixture-only backup
  metadata, rollback, tombstone i replay. To NIE jest certyfikat prawdziwego
  backupu. Nowy exact-SHA CI/restore i delivered production report pending.
- Nie zmergowano main, nie wykonano migracji produkcyjnych ani promocji.
  Przed merge obowiązuje nowy zaufany main backup bezpośrednio przed zmianą.

## Private production media — 2026-10-03 04:34 UTC

Final scope evidence: **92d053a9c952cd631caeaabc9359b6daff404f59**.
Exact CI **37097019891 SUCCESS**, including lint/types/unit/build/audit,
gitleaks/CodeQL, isolated DB/HTTP and desktop/mobile browser regressions.
Saved-artifact restore **37097029884 SUCCESS**, trusted main backup37093068451:
10 bytes/checksums/private objects, project and direct-chat HTTP owner/admin
serving, signature/anonymous/IDOR rejection and real restored MFA/client
login PASS. Original ProjectImage/DirectMessage attachment refs both0; HTTP
proof uses disposable fixtures with restored bytes, not actual customer login.
Test store independently confirmed empty after cleanup.
Source readonly diagnostic backup **37097031422 SUCCESS**, 10 objects from
3 configured stores (public Blob, new Private Blob, Supabase); encrypted artifact
11264383863, archive SHA256
`9cddee694d501f498a33631c39a89a2a0202afa66d71d35425a1e8e40738f93e`.
It is a branch diagnostic, not the trusted-main pre-migration gate.
The Production-only PRIVATE_BLOB connection is saved in Vercel; preview access
removed/confirmed, and GitHub backup secret independently verified present.
No source file/customer removal or rotation of old public CMS credentials.
No main merge/public-domain promotion: **A10 execution and A14 delivered
production monitoring still require implementation/verification**.
Next worker: complete these, verify one exact SHA, take fresh trusted main
backup immediately before outbox migration/main merge, stage and promote only
after all release gates. Do not claim this scoped infrastructure result as
the whole audit deployment. Local evidence checkpoint edits are intentional;
durable evidence also recorded in PR26 comment, avoiding a docs-only CI rerun.

PRIVATE-PRODUCTION-MEDIA-20261003 approved by owner. Created separate
`coolink-client-media-private`, `store_rV1Oa03Q3jg8NzRm`, Private/FRA1,
Hobby with no paid plan. Connection to cool-ink explicitly saved/confirmed
**Production only**, prefix PRIVATE_BLOB, sensitive read-write token.
Initial UI connection unexpectedly retained Preview; corrected and independently
verified before any code push/build. Public CMS store/token unchanged.
GitHub PRIVATE_BLOB_READ_WRITE_TOKEN saved; no values in logs/repo.
New code requires the separate token for uploads, scopes reads/deletes to its
exact private hostname, never borrows public CMS token; Supabase fallback retained.
Backup enumerates public and private stores under distinct provider paths,
with no public-access fallback for private objects. Recovery overrides only
the isolated test credential and includes direct-chat attachment checks.
Types, targeted lint and 14 targeted tests PASS; exact 13195a0 CI37095487104
SUCCESS. New SHA still requires exact CI and saved-artifact restore; no promotion.
A10 execution and A14 delivery remain open. No customer or source files removed.

## Private media recovery — 2026-10-03 04:09 UTC

04:18 UTC: saved-artifact restore **37095491129 SUCCESS /13195a0**.
10 actual saved objects restored to the isolated Private store, verified
byte-for-byte and denied anonymously; actual Next client/admin signed media
serving and foreign-client/signature denial PASS. All original ProjectImage
references in this snapshot: **0**; restored-byte serving uses disposable
fixtures, not a claim of existing production-private-image coverage.
Actual source MFA enabled true, original ciphertext used, fixtureOnlyMfa false;
Next admin/client login, CRM linking, logout and session revocation PASS.
New-store Manage Blobs UI independently confirms **There are no blobs in this
store yet** after exact-object cleanup. Original files and encrypted backup
remain untouched. Exact CI37095487104 /13195a0 still in progress; gitleaks,
CodeQL and backup-snapshot SUCCESS, browser/HTTP still running.

Additional production configuration gap observed: existing connected
`coolink-media` store_EJoRYywWQyUvNDU5 is **Public**, whereas project/chat
uploads request `access: private` using the same BLOB_READ_WRITE_TOKEN.
CI exercises the isolated Supabase fallback without that public Blob token,
so its success does not prove this production storage configuration works.
The new approved store is test-only and must not be connected to production.
Next request: authorize a **separate private production store/token** with
no paid plan, leaving public CMS storage unchanged; code must separate the
two credentials and backups must cover both. No production configuration
or source media changed. A10 execution and A14 delivery also remain open.

Owner approved MEDIA-RESTORE-20261003. Created separate Private Blob store
`coolink-recovery-drill-private`, ID `store_3Yn2RpULDWBtDc8W`, FRA1,
no production project connection or paid plan. New store-only token saved as
GitHub `DRILL_BLOB_READ_WRITE_TOKEN`; no production token changed.
Exact e95a135 CI37093678056 SUCCESS, including desktop/mobile privacy review.
Prepared manual-only saved-artifact media restore with fixed store/run prefix,
64 MiB budget, checksum verification, anonymous denial and actual application
owner/admin serving plus IDOR/signature checks. Child fetch and SDK Undici
restricted to loopback and read-only isolated private hostname.
Cleanup targets only newly uploaded run objects; production source untouched.
13 targeted tests, TypeScript and targeted lint PASS. New code still needs
its exact CI and actual restore execution; no publication or A01 closure yet.
A10 separate confirmed execution and A14 monitor/delivery remain open.

## Recovery update — 2026-10-02 16:44 UTC

2026-10-03 03:25 UTC: owner confirms MFA working and saved recovery codes;
no secret supplied or source account modified by worker. Individual privacy
review/retention approved; real-client deletion still not authorized for worker.
PR26 prepared review-only flow: owner permission, origin/rate/body limit,
SHA256 CAS revision, serializable review/audit/own-client notification,
no resolved/deleted state on save. Client sees only its response, no internal
reason or reviewer. 14 targeted tests, TypeScript and targeted lint PASS.
Desktop/mobile browser regression added but not yet run. Exact abec305
CI 37037450528 confirmed SUCCESS. New SHA still requires complete CI.
Fresh trusted main escrow backup planned against observed staged
cool-m49mvi8je-cool-ass.vercel.app; no domain promotion/migration/deletion.

03:28 UTC: fresh trusted main backup **37093068451 SUCCESS / eb6ff76**,
runtime_config=true; encrypted artifact **11263182680**, archive SHA256
`0d5f04fda2d852565918096e90de4392b29bc4eb6cfcc7734a3dea6f1277d294`.
Review-only implementation pushed **0928911**; exact CI **37093058529**
running (CodeQL and backup-snapshot PASS). Prepared integrated restored Auth
+ actual Next client login with loopback gateway, not synthetic identity.
Local gateway/inventory/crypto tests: 12 PASS; types PASS. Saved-artifact
drill planned after push. Private-media serving and separate privacy execution
remain open; neither prepared code nor backup success closes those findings.

03:33 UTC: restore **37093348098 SUCCESS /49901d5**, saved trusted backup
37093068451. Actual source MFA enabled now confirmed **true**, restored
ciphertext used true, fixtureOnlyMfa false. Real Next production-build admin
MFA challenge/login/revocation and client app login/CRM linking/own notifications,
anonymous/admin rejection and logout PASS. Inventory32/Auth links22 and
actual crypto records1MFA/1Google PASS. Private-media bytes/signatures still
not a full private-storage HTTP recovery certificate.
Review CI **37093058529 FAIL /0928911**: browser selectOption timed out on
exact label Decyzja, before saving the form. Label wrapped option text; changed
to separate explicit htmlFor/id label, preserving real accessible interaction.
Latest49901d5 CI37093349593 currently running; wait for its gitleaks before
pushing the correction. No running database worker cancelled. No publication.

03:45 UTC: corrected label pushed **e95a135**, exact CI **37093678056**
running; CodeQL and backup-snapshot SUCCESS, verify at isolated DB tests.
No further code push while this exact regression runs. Offline Chrome/Edge
semantic probe unavailable locally; not counted as successful UI proof.
Separate authorization question submitted for a **private isolated test media
store and restoration**, no production changes and no paid plan. Existing
approved restoration scope is disposable offline runner, not uploading real
customer files to a new external provider store. Do not assume this new consent
from the prior MFA/escrow response. A10 execution and A14 monitor receipt also
remain open. Local AUTOPILOT/checkpoint edits belong to this worker; preserve.

Latest: **37037505567 SUCCESS** / `abec305` from saved main backup
37035132250, including actual restored pending MFA ciphertext cloned into
the disposable test account for HTTP challenge/login/revocation. Original
source MFA enabled status is reported separately; it is not enabled by the
drill. Owner asked to personally enable MFA and retain recovery codes (never
send them in chat). Privacy retention/execution choice also awaiting owner.
Exact CI **37037450528** / `abec305` still running. No publication/migration.

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
