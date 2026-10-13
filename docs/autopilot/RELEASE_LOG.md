# Rejestr wydań i rollback

## 2026-10-13 — PR54, zadatki wizyt; produkcja zawiera również PR55

- Zgoda final32f46ae: https://github.com/Cool-Ass/CoolInk/pull/54#issuecomment-6135007741.
  Exact-head32f46ae9b685e390e693a5603bbc5dda041e6d30 CI38323925474 SUCCESS;
  squashmainab52372dcca198f9f0c56859e892b2d66057abbf CI38325719355 SUCCESS.
  Wszystkie3jobs,485 unit,10 desktop/mobile E2E, bezpieczeństwo i oba Vercel PASS.
- Pre-migration backup38325560880, artifact11781021443,
  sha256567701d2290506d062db17f105c201b250dd5d990143f3b9a57a6b02b11f9f5c;
  spójny snapshot+counts,17media i sealedruntime,00:07UTC.
  Staged47kxnro75nWATLtX6HPkQveZykTX zastosował jedynie addytywną migrację
  20261013010000_visit_deposits; wszystkie migracje zakończone poprawnie.
- Postschema backup38325881445, artifact11780867400,
  sha256678d40a0bb7a56d6f4efa0c73d0c1295176ea72d0ef51d4518e01eef228c2074;
  restore saved-artifact38326042673 SUCCESS: checksum/decryption/counts/media,
  42Authusers/31linkedclients, MFA/session i logowanie aplikacji w izolacji.
  Bez restore na produkcji ani rotacji kluczy; bez nowych wpłat/testowych klientów.
- Zadatki przypisane do wizyt, jawne jednorazowe przypisanie starych wpłat,
  edytowalne instrukcje gotówka/BLIK i podgląd klienta; gotówka pierwsza,
  równorzędne nagłówki i ikonki copy. Legacy historia pozostaje zachowana.
  Bez bank API, kodów BLIK, automatycznego paid lub naliczania pieczątek.
- Przerwanie przed promocją PR54; przy wznowieniu inne upoważnione zadanie
  opublikowało nowszy PR55. Current Production acd7cb1fd60cda2441898a7e8bf0701c72c540dc,
  7P9unKagdUbwguVA1VF4jkBo134N/cool-8oyero8mm-cool-ass.vercel.app,
  www.coolinktattoo.pl, potwierdzony07:49UTC. PR54 jest jego przodkiem.
  Nie promowano ponownie starszegoab52372. LatestmainCI38362388433 SUCCESS;
  recovery38364151128 SUCCESS. AutoassignDisabled ponownie potwierdzone07:55UTC.
- Smoke07:49UTC: home/app/adminlogin/privacy200, chronioneadminappointments
  i depositsettings401. Istniejąca sesja klienta/projekty renderują się poprawnie;
  brak kwalifikującej wpłaty na tym koncie, stan wpłat potwierdzony izolowanym E2E.
- DONE: obserwacja07:50–08:05UTC PASS. ProductionLast15min223invocations,
  Error0%,Timeout0%,CPUP7571ms (wcześniejszybaseline210ms).
  Finalny smoke08:03UTC200/401 PASS; żadnych nowych finansowych zapisów.
- Dowody lokalne poza repo: artifacts/pr54-production-2026-10-13.png,
  artifacts/pr54-client-production-2026-10-13.png i pr54-observation-2026-10-13.png.
  Rollback sprzed PR54:9ebb598/gnJqbQAKw1fyysnKFT3e4wzwNLj1; po użyciu
  nowego modelu najpierw zatrzymać edycję zadatków i uzgodnić odczyt nowych wpłat.
  Nie usuwać nowych kolumn/historycznych wpisów i nie przywracać bazy bez zgody.
  Ten evidence branch nie jest artefaktem aplikacji do publikacji.

## 2026-10-09 — PR45, publikacja01:36:32UTC /03:36:32CEST

- Zgoda: https://github.com/Cool-Ass/CoolInk/pull/45#issuecomment-6072201812.
- Exact-head ce329048c76950d5971b3e8fa24be00493eb45c7 CI37868152072 SUCCESS;
  squash main413ca66f3e4127b301ef19d32c7e82ba5407f86e CI37869186349 SUCCESS.
  Oba cykle verify/backup-snapshot/CodeQL, oba statusy Vercel SUCCESS.
- Ręczna promocja DbPbNeVnckttDDw2A7w9nMUo1Yz8,
  cool-9gr1anr4i-cool-ass.vercel.app; Current Domains www.coolinktattoo.pl.
  Auto-assign Disabled, żadnego bypass gate ani nowych migracji.
- Alarm przypomnień rozwiązany dopiero późniejszym sukcesem, historia zachowana;
  recovery wyjaśnia opóźnienie bez osłabienia2h; Google loguje allowlistę kodów.
  Minimalny patch Next/eslint16.3.8; produkcyjny audit0 w CI.
- Staged home działał w browser SSO; shell200 był login redirect, nie app smoke.
  Staged API browser blocked, nie obchodzono blokady. CI authorization PASS.
- Produkcja smoke po promocji i01:52UTC: /,/app,/admin/login200;
  /api/admin/announcements401 bez sesji. Bez fixtures i ręcznych sync.
- Obserwacja01:36:32–01:52UTC PASS: baseline68/0%Error/0%Timeout/256msCPU P75;
  końcowe Production Last15min84/0%/0%/13ms. Dane obecne.
- Dowody lokalne poza repo: artifacts/pr45-production-2026-10-09.png,
  artifacts/pr45-observation-2026-10-09.png.
- Istniejący Google queue1/EXPORT_FAILED1 pozostaje osobnym zadaniem;
  ten pakiet nie naprawia przyczyny integracji i nie rotuje OAuth/sekretów.
- Rollback c304744f61660037ce0932ac2fbb06af29c1a0f0,
  25GuxXsM8cc9zNY22EybLzVvKEXA, tylko kod, bez restore; niewykonany.

## 2026-10-06 — PR40, publikacja 02:56:43 CEST / 00:56:43 UTC

- Zakres: obrys/cień tekstu w sekcji Tekst; obraz jako dekoracyjna nakładka
  widgetów/kolumn/sekcji z kryciem, fit, pozycją i repeat; przezroczysta ramka
  widgetu Obraz. Bez zmian uploadu, auth, bazy lub płatności.
- Zgoda właściciela: https://github.com/Cool-Ass/CoolInk/pull/40#issuecomment-6006361951.
- Pierwsza regresja37393590877 wykazała scroll-origin w istniejącym teście drag
  po dodaniu wysokiego fixture obrazu;9b44b46 resetuje scroll przed pomiarem.
  Nie pominięto ani nie osłabiono żadnej asercji. Następna regresja PASS.
- Exact-head9b44b46 CI37394486798 oraz exact-mainad434aa CI37395584488 SUCCESS:
  verify/E2E, audit, gitleaks, CodeQL, izolowana baza/HTTP i backup-snapshot.
- Vercel8BydWbL4snRywt6f1fjkEvBTAScW, cool-o7basf33p-cool-ass.vercel.app,
  ręczna promocja na www.coolinktattoo.pl / cool-ink.vercel.app.
- Auto-assign Custom Production Domains nadal Disabled; brak produkcyjnych fixture.
- Pierwszy smoke: home/app/admin-login200, chronione API kalendarza/lojalności401.
- Obserwacja PASS: pierwszy smoke00:57:09UTC; przerwana i wznowiona rano.
  Świeże Production Last15min05:56–06:11UTC Error0%/Timeout0%; końcowy smoke
  home/app/admin-login200 i chronione API401. Nie deklarujemy ciągłej obserwacji nocy.
- Dowód: artifacts/pr40-production-2026-10-06.png (poza repo, exact SHA/domains).
- Rollback8a9431e/fLYEoVMDMxwLS9B7iDeRuSJDdJAX bez restore danych, niewykonany.

## 2026-10-06 — PR39, publikacja 01:37:35 CEST / 2026-10-05 23:37:35 UTC

- Zakres UI-only: wspólny kompaktowy inspector i globalne style, prowadnice
  px/drag/kąt/duplikacja, sesje od najnowszej, wspólny formularz rozliczenia
  i edycja dat w kalendarzu z zachowaniem czasu trwania wizyty.
- Zgoda właściciela: COMPACT-WORKFLOW-20261005,
  https://github.com/Cool-Ass/CoolInk/pull/39#issuecomment-6001879191.
- PR39 exact-head88e9ba1: CI37367158121 attempt2 SUCCESS. Awaria runnerów
  blokowała attempt1; nie pominięto ani nie osłabiono żadnych bramek.
- Normalny merge: `8a9431ed9d26cb285f38fb47393d2e708092d47d`.
  Exact-main CI37388586456 SUCCESS: verify/E2E/security/backup-snapshot.
- Vercel `fLYEoVMDMxwLS9B7iDeRuSJDdJAX`, `cool-d1658zr1e-cool-ass.vercel.app`;
  ręczna promocja na www.coolinktattoo.pl / cool-ink.vercel.app.
  Auto-assign Custom Production Domains Disabled ponownie potwierdzone.
- Smoke readonly: /, /app, /admin/login, /app/terminy HTTP200;
  /api/admin/calendar-snapshot i /api/admin/settings/loyalty HTTP401 bez sesji.
- Bez sesji /admin przekierowuje do /admin/login, a /app/terminy oraz
  /app/portal/calendar do /app; HTTP200 po redirect nie jest dowodem dostępu
  do prywatnego kalendarza. Istniejąca sesja klienta w przeglądarce otworzyła
  kalendarz z nagłówkiem październik2026 i załadowanym logo, bez poziomego
  overflow. Admin wymaga ponownego logowania; nie omijano MFA.
- CI: 83 pliki testowe PASS i wszystkie4 scenariusze browser E2E PASS.
- Obserwacja PASS,23:38:30–23:54:07UTC, ponad15min; Production, Last15min,
  Error0%/Timeout0%. Odświeżane metryki i końcowy readonly smoke PASS.
- Wydanie zakończone i zweryfikowane. Bez incydentu/rollbacku; lease zwolniony.
  Osobny branch ai/release-pr39-evidence zawiera wyłącznie dowody Markdown,
  nie zmienia promowanego SHA ani aplikacji.
- Bez migracji, mutujących smoke produkcji, zmian zasad finansowych i auth.
- Rollback: poprzedni publiczny202c8f1 /CXSorzy7faJTyhSr2PNCPynFVXRS,
  bez restore danych. Wpis dowodowy nie zmienia SHA promowanej aplikacji.

## 2026-10-03 — audyt i wspólny UI, publikacja 09:44:42 UTC

- Zgody: AUDIT-20260930, HOSTING-GATE-20261002, CONFIG-ESCROW,
  AUDIT-FINAL-20261003; nie zgoda na usunięcie konkretnego klienta/restore produkcji.
- PR26 integruje pakiety audytu/UI; PR37/38 naprawiają rzeczywistą granicę
  Vercel OIDC i proxy podpisanego monitoringu, bez ogólnego bypassu mutacji.
- SHA `202c8f122c9bf4422846fe4a8a0d909152477c79`, Vercel
  `CXSorzy7faJTyhSr2PNCPynFVXRS`, www.coolinktattoo.pl / cool-ink.vercel.app.
  Ręczna promocja po exact-main CI37113405016 SUCCESS,
  backup37113478046 SUCCESS i saved-artifact full/private restore37113647881 SUCCESS.
  Źródłowy backup bezpośrednio przed migracjami37110145516 SUCCESS.
  Migracje: google_export_outbox20261002010000,
  privacy_execution_guard20261003050000, forward-only correction20261003081000.
- Wdrożone: wspólne compact admin/client UI i kalendarz, ręczny status ZAJĘTY,
  hero builder, poprawki security/recovery/privacy/Google outbox/płatności/czatu.
  Private Blob wyłącznie Production; CMS public store i izolowane testy oddzielne.
- Probe37113476751: trwały alarm właściciela potwierdzony, oczekiwany failure.
  Normalny publiczny monitoring37114086817 SUCCESS, Google37114185152 SUCCESS.
  Codzienny sealed runtime backup włączony przez BACKUP_RUNTIME_CONFIG=true.
- Smoke: public200, niezalogowane chronione API401, machine cronGET405,
  portal/kalendarz klienta i logo działają; konstrukcyjny home zachowany.
- Obserwacja: PASS,09:44:42–10:00:19UTC, ponad15min; Error0%/Timeout0%.
  Wynik wydania: wdrożone i zweryfikowane. Brak rollbacku/incydentu.
  Historyczne propozycje20/22/24/25 zamknięto dopiero po potwierdzeniu,
  że dokładne head SHA są przodkami promowanego main; gałęzi nie usuwano.
- Poprzedni publiczny deploymentCLvFkq1DdLDNfdKqaQeccqU1nyPX (`ed85fb8`).
  Przygotowany zgodny rollback: e370bd1 /9HVf5Ank4G9bCbarKSEzXkGiANfk,
  bez kasowania kolejek, plików, kluczy czy odtwarzania bazy. Rollback niewykonany.
- Pełne dowody i granice: [AUDIT_CHECKPOINT](AUDIT_CHECKPOINT.md).
  Dalszy wpis dokumentacyjny nie zmienia promowanego SHA ani obrazu aplikacji.


## 2026-09-30 — bootstrap Autopilot v1 (dokumentacja)

- Baza: `56fe9a3151b2a339f76b94cae85dd66dc15a4ac6`; branch `ai/autopilot-v1`.
- Zakres: osiem nowych plików Markdown; bez zmian aplikacji, workflow i danych.
- Zgoda: jawne zlecenie właściciela na dodanie i push dokumentacji; ADR-001.
- Identyfikator commitu: commit dodający ten wpis, widoczny w historii Git.
- Walidacja: PASS — kontrola diff/whitespace, dokładnie osiem nowych plików
  Markdown i wszystkie lokalne linki. CI nowego SHA sprawdzane osobno.
- Deployment aplikacji / production smoke: nie wykonano w bootstrapie.
- Rollback: revert commitu dokumentacyjnego; nie wymaga restore bazy.

## Potwierdzone informacje historyczne (nie nowe wdrożenia)

- PR #16 / `56fe9a3`: uprawnienia kalendarza i archiwalne rezerwacje.
  [Quality and security zakończone success](https://github.com/Cool-Ass/CoolInk/actions/runs/36642707311).
- PR #15 / `fd23140`: porównywanie liczby rekordów niezależnie od collation.
- PR #14 / `1390d74`: tooling PostgreSQL 17 i korekty backup/restore.
- [Backup success](https://github.com/Cool-Ass/CoolInk/actions/runs/36552750345)
  dla `fd23140`; nie dowodzi dzisiejszej świeżości ani udanego restore drill.

Każde następne wydanie: data UTC, zadanie/ryzyko, commit/PR, zgoda, wszystkie
CI/E2E/security run URL, backup gate (lub uzasadnione N/A), deployment ID/URL,
poprzednia wersja, smoke i obserwacja, wynik, rollback (czas, powód, wersja,
wynik ponownego smoke), link do incydentu. Bez dowodu oznacz UNKNOWN/PENDING.
