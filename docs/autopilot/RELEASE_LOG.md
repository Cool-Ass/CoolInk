# Rejestr wydań i rollback

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
