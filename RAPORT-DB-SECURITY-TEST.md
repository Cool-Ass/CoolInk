# CoolInk — audyt bezpieczeństwa Data API (środowisko testowe)

Data: 2026-08-25
Środowisko: wyłącznie testowy projekt Supabase `COOLINK APP` (`elwdamixzdqmjcgqaiyq`).
Produkcja `kqqqhasawqodikpzjemy` nie została odczytana ani zmieniona w tym etapie.

## Model dostępu

Kod aplikacji nie używa Supabase JS/PostgREST z przeglądarki do tabel `public`.
Przeglądarka rozmawia wyłącznie z endpointami Next.js; te weryfikują sesję Supabase Auth, własność danych oraz używają Prisma po stronie serwera. Nie ma zatem uzasadnienia dla bezpośredniego dostępu ról `anon` ani `authenticated` do żadnej tabeli aplikacji.

Prisma używa bezpośredniego, serwerowego connection stringa jako właściciel bazy. Właściciel omija RLS, co zachowuje panel administratora i endpointy backendowe. `DATABASE_URL` oraz `DIRECT_URL` nie mogą być nigdy zmiennymi `NEXT_PUBLIC_*` ani trafić do bundle klienta.

## Audyt przed poprawką

| tabela | RLS | `anon` | `authenticated` | policies | model docelowy |
|---|---:|---|---|---|---|
| AdminUser | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| Client | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| TattooProject | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| Appointment | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| AvailabilityBlock | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| WorkingHours | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| Promotion | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| ContactMessage | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| ProjectActivity | tak | pełne CRUD | pełne CRUD | brak | tylko backend |
| ClientNotification | tak | pełne CRUD | pełne CRUD | brak | tylko backend |
| DocumentAcceptance | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| StudioDocument | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| ProjectImage | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| Page / PortfolioItem / Media / NavItem / SiteSetting | nie | pełne CRUD | pełne CRUD | brak | tylko backend |
| _prisma_migrations | nie | pełne CRUD | pełne CRUD | brak | Prisma tylko po stronie serwera |

W `public` nie znaleziono widoków, materialized views, funkcji/RPC ani sekwencji aplikacyjnych.

## Migracja

Dodano: `20260825050000_lock_down_public_data_api`.

Migracja:

- włącza RLS dla każdej istniejącej tabeli aplikacyjnej w `public`;
- odbiera `PUBLIC`, `anon` i `authenticated` wszystkie prawa do tabel, widoków, sekwencji oraz funkcji;
- odbiera te uprawnienia także domyślnie dla przyszłych obiektów utworzonych przez właściciela migracji;
- nie tworzy szerokich policies, ponieważ bezpośredni dostęp Data API nie jest częścią architektury CoolInk.

`_prisma_migrations` ma odebrane grants, ale nie ma RLS, aby nie ingerować w mechanikę Prisma. Nie jest wystawione przez Data API.

## Wynik po migracji na kopii testowej

Wszystkie 18 tabel aplikacyjnych: **RLS enabled**, `anon`: brak grants, `authenticated`: brak grants, policies: brak.
`_prisma_migrations`: brak grants dla ról Data API.

Migracja `20260825050000_lock_down_public_data_api` została zastosowana tylko w projekcie testowym, a `prisma migrate status` zwróciło `Database schema is up to date`.

## HTTP Data API — wykonany test

Użyto wyłącznie testowego `DRY_RUN_SUPABASE_URL` oraz testowego publishable key
z ignorowanego `.env.dryrun.local`. Skrypt ma jawną allowlistę refa
`elwdamixzdqmjcgqaiyq`, odmawia działania dla innego URL i nie wypisuje klucza.

| podmiot | tabele | SELECT | INSERT | UPDATE | DELETE | wynik |
|---|---:|---|---|---|---|---|
| anon | 18 | 401 | 401 | 401 | 401 | PASS — brak danych |
| authenticated Client A | 18 | 403 | 403 | 403 | 403 | PASS — brak danych |
| authenticated Client B | 18 | 403 | 403 | 403 | 403 | PASS — brak danych |

Dotyczy to wszystkich tabel aplikacyjnych, w tym `Client`, `TattooProject`,
`Appointment`, `ClientNotification`, `ProjectActivity`, `AdminUser`,
`ContactMessage`, `DocumentAcceptance`, `StudioDocument` i `ProjectImage`.
Nie wystąpiła odpowiedź 2xx ani ujawnienie payloadu. `401` dla anon i `403` dla
zalogowanych użytkowników są oczekiwanym skutkiem braku grants/policies.

## Automatyczny test regresji

Dodano:

- `npm run db:security:audit` — wypisuje RLS, grants i policies wszystkich relacji oraz funkcje w `public`;
- `npm run db:security:verify` — tworzy tymczasowych klientów A/B na bazie testowej, a następnie sprawdza osobno `SELECT`, `INSERT`, `UPDATE`, `DELETE` dla `anon` i `authenticated`, próby dostępu klienta A do danych B oraz serwerowy odczyt Prisma. Dane testowe są usuwane w `finally`.

Wynik uruchomienia: **PASS** — anon/authenticated CRUD zablokowany; klient A nie może uzyskać danych klienta B; Prisma ma dostęp właścicielski.

## Kontakt i dane publiczne

Formularz kontaktowy zapisuje wiadomości wyłącznie przez `/api/contact`, gdzie działa kontrola originu, rate limit, walidacja oraz honeypot. `anon` nie ma bezpośredniego INSERT ani SELECT do `ContactMessage`.

Publiczna strona, portfolio, promocje, godziny pracy i dostępność są czytane serwerowo przez Prismę. Żadna tabela `public` nie jest celowo udostępniona bezpośrednio przez Data API.

## Kontrole jakości

- `npm run typecheck` — PASS
- `npm test` — PASS (2/2)
- `npm run lint` — PASS, 17 istniejących ostrzeżeń, 0 błędów
- `npm run build` — PASS

Po wyczyszczeniu wyłącznie `.next` zbudowano aplikację ponownie z konfiguracją
wyłącznie testowego projektu `elwdamixzdqmjcgqaiyq`. Kompilacja potwierdziła
brak referencji produkcyjnego projektu w artefaktach. Sam build przeszedł, ale
`next start` na świeżym artefakcie zwraca przy `GET /` HTTP 500 z błędem
`webpack-runtime.js: Cannot read properties of undefined (reading 'call')`.
Ten błąd występuje przed zapytaniem Prisma i powtarza się po drugim czyszczeniu
`.next` oraz pełnym buildzie. Nie jest błędem RLS.

`npm audit --omit=dev` nadal zgłasza **3 podatności high** w zależnościach
`postcss` i `sharp` dostarczanych przez Next.js. Zgodnie z ustalonym zakresem
nie aktualizowano teraz Next.js, sharp ani PostCSS; to pozostaje niezależnym
blokerem późniejszego publicznego release.

## Końcowy stan dry-runu

Bloker runtime został zdiagnozowany jako niezgodność lokalnego Node 24 z
aktualnym Next 15.5.23. Ten sam build działa na Node 20 i 22. Projekt został
przypięty do Node 22 przez `engines.node = "22.x"` i `.nvmrc = 22`; nie
aktualizowano Next.js ani nie zmieniano bazy.

- czysta instalacja `npm ci` na Node 22 — PASS, bez zmiany lockfile;
- `typecheck`, testy, lint (17 ostrzeżeń, 0 błędów) i build na Node 22 — PASS;
- `next start` na Node 22 — PASS: `/` 200, `/budujemy` 200, `/admin` 307 bez sesji;
- smoke klienta — PASS: kontakt, rejestracja/logowanie, profil, projekt, accept/reject, powiadomienia, dokumenty, ICS i izolacja HTTP Client A/B;
- smoke administratora — PASS: logowanie, dashboard/karty, edycja projektu (cena, zadatek, notatka), propozycja, wiele sesji, edycja, completed, no-show, anulowanie i brak duplikatów activity log;
- ponowiony `db:security:audit` — PASS: RLS na wszystkich 18 tabelach aplikacyjnych, bez grants/policies;
- ponowiony `db:security:verify` — PASS: CRUD anon/authenticated zablokowany, izolacja A/B zachowana, Prisma działa;
- ponowiony `db:security:http-verify` — PASS: anon otrzymuje 401, a dwa konta authenticated 403 dla CRUD na wszystkich 18 tabelach;
- połączenia Prisma do kopii testowej były stabilne z lokalnym `sslmode=disable`: brak P1001, P1011, timeoutów, limitu poolera i 5xx runtime.

**DB SECURITY READY** — końcowy smoke test aplikacji i testy Data API/RLS
przeszły wyłącznie na projekcie testowym. Produkcja nie została zmieniona.

## Osobny warunek publicznego release

`npm audit --omit=dev` nadal zgłasza 3 podatności high w `postcss` i `sharp`
przechodzące przez obecną linię Next.js. Nie wykonano `npm audit fix --force`.
**PUBLIC RELEASE NOT READY — NEXT.JS SECURITY UPGRADE REQUIRED.**
