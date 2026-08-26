# Raport przed wdrożeniem — CoolInk

**Data audytu:** 25.08.2026
**Zakres:** wyłącznie odczyt produkcyjnej bazy, lokalny kod i migracje. Nie wykonano migracji, deployu ani zapisu do produkcji.

## Decyzja

**NIE GOTOWE DO MIGRACJI PRODUKCYJNEJ.**

Powód blokujący: Prisma widzi cztery nieuruchomione migracje, ale produkcyjna baza już fizycznie zawiera trzy z czterech zmian. Uruchomienie obecnego `prisma migrate deploy` spróbuje ponownie utworzyć istniejące tabele lub kolumnę i zakończy się błędem. Najpierw trzeba bezpiecznie zarejestrować istniejący stan jako baseline, a potem przetestować oraz zastosować wyłącznie migrację workflow.

Drugi blocker przed publicznym deployem: `npm audit --omit=dev` wykazał **3 podatności wysokiego ryzyka** w `next`/jego `postcss` oraz `sharp`. Wymagają osobnej, przetestowanej aktualizacji zależności; nie stosowano automatycznej naprawy.

## A. Rzeczywisty stan produkcji

Odczytowe sprawdzenie `prisma migrate status` wykazało, że w `_prisma_migrations` nie ma żadnej z lokalnych migracji. Jednocześnie kontrola `information_schema` wykazała:

| Obiekt produkcyjny | Stan | Rekordy |
|---|---:|---:|
| `Client` | istnieje, w tym `avatarUrl` | 2 |
| `TattooProject` | istnieje | 0 |
| `Appointment` | istnieje | 0 |
| `AvailabilityBlock` | istnieje | 0 |
| `WorkingHours` | istnieje | 0 |
| `Promotion` | istnieje | 1 |
| `ContactMessage` | istnieje | 0 |
| `ProjectActivity` | nie istnieje | — |
| `ClientNotification` | nie istnieje | — |

Wniosek: pierwsze trzy zmiany zostały wcześniej wprowadzone poza historią Prisma (np. przez `db push` albo ręczny SQL). Nie wolno ich teraz wdrażać przez `migrate deploy` bez baseliningu.

## B. Audyt migracji

### `20260821120000_add_contact_messages`

- SQL tworzy tabelę `ContactMessage`.
- Kolumny: `id`, `name`, `email`, `subject` nullable, `message`, `isRead DEFAULT false`, `createdAt DEFAULT CURRENT_TIMESTAMP`.
- Klucz główny: `ContactMessage_pkey` na `id`.
- Brak enumów, relacji, indeksów dodatkowych i constraintów poza PK.
- Nie zmienia ani nie usuwa danych.
- Produkcja ma już identyczną tabelę. Ponowne wykonanie: **destrukcyjna operacyjnie** (błąd `relation already exists`), ale nie usuwa danych.

### `20260824090000_add_booking_rules_and_promotions`

- Tworzy `WorkingHours`: `id`, unikalny `weekday`, `enabled DEFAULT true`, `startsAt DEFAULT '10:00'`, `endsAt DEFAULT '19:00'`, daty utworzenia/aktualizacji.
- Dodaje unikalny indeks `WorkingHours_weekday_key`, PK i włącza RLS.
- Tworzy `Promotion`: `id`, `title`, nullable `description`, `startsAt`, `endsAt`, nullable `badge`, `active DEFAULT true`, daty.
- Dodaje PK i włącza RLS dla `Promotion`.
- Brak enumów, FK i zmian istniejących tabel.
- Nie usuwa danych.
- Produkcja ma obie tabele, unikalny indeks oraz jedną promocję. Ponowne wykonanie: **błąd**, a nie bezpieczna migracja.

### `20260825010000_add_client_avatar`

- Dodaje nullable `Client.avatarUrl TEXT`.
- Brak defaultu, indeksu, relacji, enumu i constraintu.
- Istniejące konta pozostają poprawne: ich wartością jest `NULL`.
- Produkcja już ma tę kolumnę. Ponowne wykonanie: **błąd `column already exists`**.

### `20260825040000_add_project_workflow`

- Dodaje do `TattooProject`:
  - `depositStatus TEXT NOT NULL DEFAULT 'not_required'`;
  - `depositAmount INTEGER NULL`;
  - `depositPaidAt TIMESTAMP(3) NULL`;
  - `depositPaymentMethod TEXT NULL`.
- Dodaje do `Appointment`: `price INTEGER NULL`.
- Tworzy `ProjectActivity` wraz z PK, FK `projectId → TattooProject(id)` (`ON DELETE CASCADE`, `ON UPDATE CASCADE`) i indeksem `(projectId, createdAt)`; RLS jest włączone.
- Tworzy `ClientNotification` wraz z PK, indeksami `(clientId, readAt, createdAt)` oraz `(projectId, createdAt)` i RLS. FK jest tylko dla `clientId → Client(id)` (`ON DELETE CASCADE`, `ON UPDATE CASCADE`); `projectId` i `appointmentId` pozostają świadomie luźnymi, nullable identyfikatorami.
- Nie dodaje enumów PostgreSQL: statusy projektu, wizyty i zadatku są kolumnami `TEXT`, bez DB-check constraintów.
- Nie zmienia ani nie usuwa istniejących wierszy. Dla istniejących projektów jedyną automatyczną wartością jest `depositStatus = 'not_required'`.
- Obecnie produkcja ma 0 projektów i 0 wizyt, więc w aktualnym stanie nie nastąpi historyczne zafałszowanie zadatku ani ceny.

## C. Kompatybilność istniejących danych

### Klienci

Dwa istniejące rekordy `Client` zachowują się poprawnie. `avatarUrl` już istnieje i może być `NULL`. `ClientNotification` może legalnie zawierać zero wpisów; nie wykonujemy backfillu ani nie tworzymy sztucznych powiadomień.

### Projekty i zadatki

W produkcji nie ma jeszcze projektów. Gdyby były, aktualny SQL wpisałby im `not_required`, co semantycznie oznacza „zadatek nie jest wymagany”, a nie „brak danych historycznych”. To byłoby ryzyko **ŚREDNIE** przy późniejszej migracji bazy z projektami. Przed wdrożeniem na bazę zawierającą projekty należy zmienić model/migrację na nullable stan zadatku lub jawny `unknown`, a kod klienta/admina musi go obsłużyć.

### Wizyty i sesje

Produkcja ma 0 `Appointment`. Istniejąca tabela już ma `startsAt`, `endsAt`, `status` (`DEFAULT 'requested'`) i nullable `notes`; nowa migracja dodaje tylko nullable `price`. Czas trwania jest już bezpiecznie wyliczalny jako `endsAt - startsAt`. Nie ma wizyt bez czasu zakończenia, więc nie jest potrzebny backfill ani sztuczna długość sesji. Cena dla starych wizyt pozostałaby `NULL` — poprawnie, bez wymyślania danych finansowych.

### Statusy projektu

Stare wartości przyjmowane przez aplikację: `inquiry`, `accepted`, `scheduled`.

| Stary status | Nowy status / zachowanie |
|---|---|
| `inquiry` | `inquiry` — bez zmiany |
| `accepted` | `accepted` — nadal obsługiwany jako starszy status |
| `scheduled` | `scheduled` — nadal obsługiwany jako starszy status |

Nowe wartości: `reviewing`, `awaiting_client`, `date_proposed`, `awaiting_confirmation`, `awaiting_deposit`, `confirmed`, `designing`, `in_progress`, `awaiting_next_session`, `completed`, `cancelled`. Nie ma enumu ani SQL-owej zmiany wartości, więc nie ma automatycznej migracji statusów i nie jest ona potrzebna.

### Statusy wizyty

Stary stan to `requested` i `confirmed`; kod aktualnie obsługuje też `proposed`, `completed`, `cancelled`, `no_show`. Aktualne statusy są `TEXT`, bez enumu PostgreSQL. Stare wartości pozostają prawidłowe. `proposed` nie jest migracją enumu, tylko nową wartością używaną przez kod. Eksport kalendarza wydaje `.ics` wyłącznie właścicielowi i wyłącznie dla `confirmed`; anulowane i niepotwierdzone wizyty są odrzucane.

### Activity log i powiadomienia

Obie nowe tabele są puste po utworzeniu — to poprawne. Stare projekty nie wymagają backfillu i brak dawnych wpisów w historii nie powoduje błędu w UI.

## D. Ryzyka

| Ryzyko | Poziom | Działanie |
|---|---|---|
| Uruchomienie `prisma migrate deploy` przed baseline | **WYSOKIE** | Nie uruchamiać. Najpierw zarejestrować trzy istniejące migracje jako applied po backupie i weryfikacji. |
| Deploy kodu przed utworzeniem `ProjectActivity`/`ClientNotification` | **WYSOKIE** | Nie deployować pierwszego. Nowe endpointy i portal od razu odczytują nowe tabele. |
| 3 wysokie podatności `next`/`postcss`/`sharp` | **WYSOKIE** | Osobny PR aktualizacji zależności, testy i build; nie używać automatycznego `npm audit fix --force`. |
| Semantyka `depositStatus` na starej bazie z projektami | **ŚREDNIE** | Przed takim wdrożeniem użyć `NULL`/`unknown`, nie automatycznego `not_required`. W obecnej produkcji brak projektów. |
| RLS w nowych tabelach bez polityk | **ŚREDNIE** | Potwierdzić rolę połączenia aplikacji w środowisku testowym. Backend Prisma zwykle korzysta z roli bazy, nie klienta anon, ale to wymaga smoke testu. |
| Dublowanie części wpisów aktywności dla odpowiedzi/propozycji terminu w aktualnym kodzie | **NISKIE** | Nie zagraża danym ani migracji, ale warto usunąć przed kolejnym release. |
| 17 ostrzeżeń ESLint | **NISKIE** | Lint kończy się kodem 0; ostrzeżenia dotyczą `<img>` i wewnętrznych linków `<a>`, nie blokują działania. |

## E. Backup przed zmianą

1. W Supabase otwórz **Database → Backups** i sprawdź najnowszy dostępny punkt backupu. Na planach płatnych dostępne są codzienne backupy; na Free zalecany jest własny eksport logiczny.
2. Utwórz logiczny backup poza projektem, używając Supabase CLI: osobno `roles.sql`, `schema.sql` oraz `data.sql`. Nie zapisuj hasła bazy w repozytorium ani w historii terminala.
3. Zaszyfruj pliki, zapisz poza komputerem roboczym i zapisz SHA-256 każdego pliku.
4. Zweryfikuj backup: sprawdź, że `schema.sql` zawiera `Client`, `TattooProject`, `Appointment`, `Promotion`, `WorkingHours`; w `data.sql` porównaj liczbę `Client` = 2, `Promotion` = 1 oraz zera dla projektu i wizyt.
5. Przed produkcją odtwórz backup do nowego, tymczasowego projektu Supabase i wykonaj pełny smoke test na tej kopii.

Supabase wskazuje `db dump`/`pg_dump` jako metodę eksportu logicznego, a dla migracji i backupu zaleca połączenie direct/session zgodne z siecią. Oficjalne instrukcje: [backup i restore CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [backups Supabase](https://supabase.com/docs/guides/platform/backups).

## F. Rollback

- **Przed migracją workflow:** przy problemie wycofanie kodu do poprzedniego wdrożenia Vercel wystarcza, bo schema się nie zmieniła.
- **Po utworzeniu tylko nowych tabel/kolumn:** rollback kodu do starej wersji także wystarcza; dodatnie kolumny/tabele nie psują starego kodu. Nie usuwać ich w stresie.
- **Po błędnym baseliningu historii Prisma:** zatrzymać deploy. Nie edytować ręcznie `_prisma_migrations` bez backupu; przywrócić backup lub skorygować status wyłącznie po ustaleniu dokładnego stanu.
- **Po uszkodzeniu danych:** przywrócić najbliższy backup/PITR do projektu lub, bezpieczniej, odtworzyć do nowego projektu i zweryfikować przed przełączeniem połączeń. Restore Supabase powoduje niedostępność projektu, więc należy zaplanować okno serwisowe.
- Prisma nie ma magicznego `migrate rollback`; cofnięcie schematu to osobno przygotowany SQL albo restore backupu.

## G. Zalecana kolejność bezpiecznego wdrożenia

1. Zatwierdzić oddzielnie aktualizację zależności bezpieczeństwa i przygotować dodatkową korektę semantyki zadatku, jeżeli produkcja zacznie zawierać stare projekty.
2. Wykonać backup i odtworzyć go do tymczasowego projektu/branchu Supabase.
3. Na kopii zweryfikować pełny obecny schemat; zarejestrować trzy wcześniej istniejące migracje jako applied przez `prisma migrate resolve --applied <nazwa>`. Nie wykonywać ich SQL.
4. Na kopii zastosować tylko `20260825040000_add_project_workflow`, potem przejść smoke test: admin/client login, klienci, projekt, termin, propozycja, akceptacja, notification, edycja wizyty, kolizja/bufor, zadatek, dashboard, `.ics` i Google Calendar.
5. Po pomyślnym teście powtórzyć backup, baseline, migrację workflow i smoke test na produkcji w krótkim oknie serwisowym.
6. Dopiero po pomyślnym utworzeniu nowych tabel wdrożyć aplikację. Kolejność: **migracja bazy → deploy aplikacji**.
7. Po deployu sprawdzić logi Vercel/Supabase przez 15 minut oraz `prisma migrate status`.

## H. Kontrola jakości lokalnej

- `npm run lint` — sukces, 17 ostrzeżeń i 0 błędów.
- `npm run typecheck` — sukces.
- `npm test` — 2/2 testy pomyślne.
- `npm run build` — sukces.
- ESLint został skonfigurowany przez `eslint.config.mjs`; dodano też skrypt `typecheck`.

Źródła procesu baseliningu: [Prisma migrate resolve](https://docs.prisma.io/docs/cli/migrate/resolve), [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).
