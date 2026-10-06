# Komunikaty i spójność CMS — 2026-10-06

## Zakres i przepływ

Admin (content.manage) → podgląd i potwierdzenie → transakcja publikacji
→ główny panel wszystkich klientów → zamknięcie przez konkretnego klienta.
Opcjonalnie: jednorazowy dzwonek dla obecnych, zarejestrowanych kont.
Admin może wyłączyć komunikat; znika wtedy także jego dzwonek.
Wygaśnięcie usuwa banner, ale powiadomienie pozostaje w historii do wyłączenia.
Nie wysyłamy maili, SMS ani web push, nie zapisujemy zgód marketingowych.

## Dane / niezawodność

- SiteSetting `client-announcement:<uuid>`: plain text, portalowy link z allowlisty,
  data publikacji/wygaśnięcia, notify, active. Bez nowej tabeli/migracji.
- ClientNotification: zwykłe wpisy `announcement:<uuid>` dla dzwonka;
  prywatny, przeczytany marker `announcement-dismissed:<uuid>` dla zamknięcia.
  Markery są wykluczone z API/listy/dzwonka; identyfikator klienta pochodzi z sesji.
- Powtórzenie tego samego UUID/payload nie publikuje i nie powiadamia drugi raz.
  Inna treść pod tym UUID jest odrzucana. Publikacja i wyłączenie mają wspólną
  blokadę transakcyjną; banner, fan-out i audit zapisują się atomowo.
- Same-origin, istniejące RBAC content.manage, limity zapisów, tekst React-escaped.
  Nie zmieniamy uprawnień, MFA, płatności lub zasad programu lojalnościowego.
- Limit 100 komunikatów; wygasła od ponad90 dni historia jest usuwana przy kolejnej
  publikacji wraz z powiadomieniami/markerami. Usunięcie konta już usuwa wszystkie
  ClientNotification; nie powstają prywatne rekordy w SiteSetting.
- Jednorazowy fan-out maksymalnie5000 kont (bez wniosków usunięcia). Dla większej
  bazy publikacja silent nadal dostępna; następny krok to osobna kolejka/outbox.
- Trade-off: wykorzystujemy istniejące magazyny i nie potrzebujemy migracji;
  brak edycji/re-aktywacji opublikowanej treści chroni spójność już wysłanych
  informacji. Nowy komunikat wymaga nowego potwierdzenia. Historyczne zgody
  marketingowe i zewnętrzne kanały dostarczania pozostają poza tym zakresem.

## UI i walidacja

Pages/Portfolio/Media i ekrany tworzenia/edycji korzystają ze wspólnego
WorkspaceHeader, studio-page/title/panel, AppButton i studio-icon-action:
wspólna hierarchia, promienie, odstępy, focus i stany disabled. Nie dotykamy
canvasu/inspektora ani publicznego wyglądu portfolio. Media zachowują ochronę
używanych plików i transparentność; dodano etykiety upload/search/alt.

Targeted testy: walidacja, CSRF/RBAC/rate limit, silent/notify, retry,
brak wycieku błędów bazy, wyłączenie, izolacja zamknięcia. Izolowane E2E:
desktop/mobile CMS bez overflow, banner, zamknięcie po reload, dzwonek i disable.
Produkcja: wyłącznie readonly smoke; nigdy testowa kampania do realnych klientów.
Rollback kodu do ad434aa, bez restore; nowe wpisy nie wpływają na starszy kod.
