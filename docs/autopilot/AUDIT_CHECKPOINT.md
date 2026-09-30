# Audyt — checkpoint 2026-10-01 (Europe/Warsaw)

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
- To dopiero część A13: rezerwacja/anulowanie, CMS i media nadal wymagają testów UI.
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
