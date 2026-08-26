# CoolInk — dry-run migracji bazy

Data: 2026-08-25
Środowisko: osobny projekt testowy Supabase `COOLINK APP` (`elwdamixzdqmjcgqaiyq`, Frankfurt).
Produkcja `kqqqhasawqodikpzjemy` nie została zmieniona.

## Wykonany workflow

1. Na pustej bazie testowej odtworzono strukturę istniejącą przed workflow.
2. Jako zastosowane oznaczono wyłącznie historyczne migracje:
   - `20260821120000_add_contact_messages`
   - `20260824090000_add_booking_rules_and_promotions`
   - `20260825010000_add_client_avatar`
3. `prisma migrate status` potwierdził, że jedyną oczekującą migracją jest:
   - `20260825040000_add_project_workflow`
4. `prisma migrate deploy` zastosował wyłącznie `20260825040000_add_project_workflow`.
5. Końcowy `prisma migrate status` zwrócił: `Database schema is up to date`.

## Wynik techniczny migracji

- Kolumny zadatku na `TattooProject` oraz `Appointment.price` istnieją.
- Tabele `ProjectActivity` i `ClientNotification` powstały wraz z indeksami i kluczami obcymi.
- RLS dla obu nowych tabel jest włączone.
- Prisma wykonała zapis i odczyt w nowych tabelach przy aktywnym RLS.

## Smoke test aplikacji na bazie testowej

Przeszły:

- logowanie administratora oraz ekran `Dzisiaj`;
- rejestracja i logowanie klienta;
- utworzenie projektu przez klienta;
- propozycja terminu przez administratora i akceptacja przez klienta;
- wiele wizyt, edycja terminu, completed, no-show i anulowanie;
- kolizje terminów, blokada dostępności i globalny bufor;
- aktualizacja zadatku;
- centrum powiadomień i oznaczanie wszystkich jako przeczytane;
- eksport `.ics`;
- link Google Calendar: zweryfikowany w kodzie jako poprawnie generowany URL szablonu Google Calendar;
- ochrona dostępu: drugi klient dostał `404` przy próbie odpowiedzi na cudzą wizytę i pobrania jej `.ics`.

Naprawiono także duplikację activity log: propozycja terminu i odpowiedź klienta zapisują pojedynczą aktywność biznesową, przy zachowaniu powiadomienia klienta.

## Bloker bezpieczeństwa

**DB NOT READY** do publicznego wdrożenia.

Sama historia migracji i migracja workflow przeszły poprawnie, ale w starszym schemacie RLS nie jest włączone m.in. dla `Client`, `TattooProject` i `Appointment`. Test przez publiczne API Supabase potwierdził odczyt co najmniej jednego rekordu z każdej z tych tabel przy użyciu klucza publicznego.

Przed publicznym deployem trzeba przygotować osobny, przetestowany etap: włączyć RLS dla wszystkich tabel publicznych, zaprojektować minimalne polityki dla `anon` i `authenticated`, a następnie ponowić test izolacji danych klienta. Nie wykonano tego na produkcji.

## Zależności frontendowe

Nie aktualizowano Next.js, sharp ani PostCSS.

`npm audit --omit=dev`: **3 podatności high** — zagnieżdżone w Next.js `postcss` i `sharp`; audit nie wskazuje bezpiecznej poprawki bez większej aktualizacji frameworka. Zgodnie z planem Next.js 15 → 16 pozostaje oddzielnym, późniejszym etapem.

## Kontrola jakości

- `npm run typecheck` — PASS
- `npm test` — PASS (2/2)
- `npm run lint` — PASS, 17 istniejących ostrzeżeń bez błędów
- `npm run build` — PASS

## Uwagi operacyjne

- Testowy projekt ma tymczasowo wyłączone potwierdzanie e-maili, tylko aby umożliwić automatyczny smoke test logowania. Produkcji nie zmieniano.
- Na tym komputerze Prisma ma błąd TLS z Supabase (`P1011`), dlatego połączenie użyte w tym izolowanym dry-runie korzystało z testowego session poolera bez TLS. Produkcyjnego połączenia ani konfiguracji nie zmieniano.
