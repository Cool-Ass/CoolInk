# CoolInk Tattoo Studio — Strona + CMS z edytorem modułowym

Strona dla CoolInk Tattoo Studio (Next.js 16 / React 19 / TypeScript / Tailwind v4) z pełnym
panelem administracyjnym (`/admin`), zawierającym **wizualny edytor modułowy** (mini
Elementor/WordPress zbudowany specjalnie pod ten motyw), bibliotekę mediów, zarządzanie
portfolio, rezerwacje, statystyki, magazyn, powiadomienia i globalną markę — wszystko oparte
o PostgreSQL w Supabase przez Prisma.

Sekcje takie jak Hero, O mnie, Portfolio, Studio czy Kontakt korzystają z istniejącego motywu,
ale ich treść, kolejność i oprawa są teraz sterowane z panelu. Każdy moduł ma wspólne ustawienia
tła, szerokości, odstępów, obramowania, zaokrąglenia, cienia, widoczności na urządzeniach oraz
bezpiecznych deklaracji CSS. Globalną paletę witryny zmienia się bez edycji kodu.

## 1. Pierwsze uruchomienie

```bash
npm install
cp .env.example .env
```

W pliku `.env` ustaw:
- `SESSION_SECRET` — losowy ciąg o długości co najmniej 32 znaków (`openssl rand -base64 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — dane logowania administratora
- `DATABASE_URL`, `DIRECT_URL` i publiczne zmienne Supabase
- klucze Web Push (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) i `CRON_SECRET`

Następnie utwórz i zasil bazę danych:

```bash
npm run db:push    # tworzy prisma/dev.db i strukturę bazy
npm run db:seed    # tworzy konto administratora + stronę główną z domyślnymi modułami + portfolio
npm run dev
```

Strona publiczna: http://localhost:3000, panel administracyjny: http://localhost:3000/admin
(zaloguj się danymi z `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

Ponowne uruchomienie `npm run db:seed` po zmianie `ADMIN_EMAIL`/`ADMIN_PASSWORD` w `.env`
zaktualizuje dane logowania tego konta. Nigdy nie nadpisuje treści, które już zmieniłeś w
panelu (strona główna, portfolio, ustawienia globalne) — sprawdza, czy dany rekord już istnieje,
zanim go utworzy.

## 2. Jak działa CMS — architektura

### Moduły stron (`lib/modules.ts`, `components/ModuleRenderer.tsx`)

Każda strona (w tym strona główna) to uporządkowana lista **modułów** przechowywana w polu
`Page.modules` (JSON). Dostępne typy modułów:

| Moduł | Co zawiera |
|---|---|
| **Hero** | Nadpis, nagłówek (2 linie), opis, etykiety przycisków |
| **O mnie / O artyście** | Nadpis, nagłówek, historia, podpis |
| **Pasek statystyk** | Stały układ (lata doświadczenia, klienci, zaangażowanie, projekty) |
| **Baner CTA** | Tytuł (2 linie), wiadomość, przycisk z linkiem |
| **Portfolio / Galeria** | Wszystkie opublikowane zdjęcia lub wybrane ręcznie z biblioteki portfolio |
| **Studio** | Zdjęcie, opis, baner CTA na dole |
| **Kontakt** | Dane kontaktowe, formularz wiadomości |
| **Sekcja tekstowa** | Prosty blok tekstowy, wyrównanie do lewej/wyśrodkowane |
| **Obraz + tekst** | Zdjęcie obok tekstu (lewo/prawo), opcjonalny przycisk |
| **Odstęp** | Pusty odstęp między sekcjami (mały/średni/duży) |
| **Nagłówek, tekst, obraz, przycisk, separator** | Podstawowe elementy do budowania własnego układu |
| **Galeria, kolumny i sekcja wewnętrzna** | Elastyczna galeria i hierarchia sekcja → do 8 kolumn → sekcja wewnętrzna → kolumny → widgety |
| **FAQ / akordeon** | Pytania w wariancie liniowym, kartowym albo dzielonym |
| **Lista korzyści** | Lista, siatka kart albo numerowane kroki; 1–3 kolumny |
| **Cytat / opinia** | Wariant redakcyjny, karta lub duży układ wyśrodkowany |
| **Wideo, mapa, komunikat** | Osadzenia i wyróżnione wezwania do działania |
| **Własny HTML + CSS** | Zaawansowany blok w odizolowanej ramce bez skryptów i formularzy |

`ModuleRenderer` renderuje tę listę, mapując każdy typ modułu na **ten sam komponent
publicznej strony**, który był używany wcześniej (`Hero`, `About`, `Portfolio`, `Studio`,
`Contact`, `CTABar`) — dzięki temu podgląd w edytorze i publiczna strona to dosłownie ten sam
kod renderujący, więc nie ma rozjazdu między "tym co widzisz w edytorze" a "tym co widzi
klient". Nowe typy modułów (Sekcja tekstowa, Obraz + tekst, Odstęp) korzystają z tych samych
klas stylów (`headline-texture`, `gold-underline`, kolory `ink-*`), więc nowe strony wyglądają
spójnie z resztą motywu.

### Draft / Publikacja (`Page.modules` vs `Page.publishedModules`)

Każda strona ma dwie kopie modułów:
- **`modules`** — robocza wersja, edytowana na żywo w edytorze
- **`publishedModules`** — ostatni opublikowany zrzut, który faktycznie widzą odwiedzający

„Zapisz wersję roboczą" zapisuje tylko `modules` — strona publiczna się nie zmienia.
„Opublikuj" kopiuje `modules` → `publishedModules`. „Cofnij publikację" ukrywa stronę bez
utraty jej zawartości (można ją opublikować ponownie w każdej chwili). Stan strony to
`status`: `draft` / `published` / `unpublished`.

### Treści globalne vs treści strony (`lib/content.ts` vs `Page.modules`)

- **Globalne** (`SiteSetting`, edytowane w `/admin/content`): marka i opis logo, etykiety
  menu, przyciski nagłówka, linki do social media, dane kontaktowe, tekst stopki oraz ekran
  trybu budowy. Zmiana logo tutaj aktualizuje je wszędzie — nagłówek, stopkę, panel logowania
  i sidebar administracyjny — bo wszystkie czytają tę samą wartość.
- **Treść konkretnej strony** (`Page.modules`): nagłówek Hero na stronie głównej, tekst modułu
  „O mnie" itd. — należy tylko do tej jednej strony i edytuje się ją bezpośrednio w edytorze
  wizualnym danej strony.

### Wizualny edytor / podgląd na żywo (`/admin/pages/[id]`)

Pełnoekranowy edytor: pasek górny (tytuł, status, przełącznik urządzenia, Zapisz/Opublikuj),
po lewej podgląd strony (kliknij moduł, aby go zaznaczyć — pojawia się pływający pasek
narzędzi: przesuń w górę/dół, duplikuj, ukryj, usuń, a także przeciąganie za uchwyt ⠿), po
prawej panel ustawień zaznaczonego modułu (albo przeszukiwalna lista „dodaj moduł", gdy nic
nie jest zaznaczone). Zakładka „Wygląd” daje wspólne sterowanie tłem, obrazem tła i nakładką,
szerokością, odstępami, powierzchnią, cieniem, obramowaniem, minimalną wysokością,
przezroczystością i widocznością na telefonie/tablecie/komputerze. Zakładka „Zaawansowane”
obsługuje kotwicę, klasy oraz bezpieczne deklaracje CSS. Zmiany aktualizują podgląd natychmiast;
zapis do bazy następuje dopiero po kliknięciu „Zapisz wersję roboczą" lub „Opublikuj".
Sekcje, kolumny i widgety można również skalować uchwytami na każdej krawędzi i w narożnikach;
kolumny można duplikować lub usuwać, a ustawienia typografii treści nie wpływają na elementy
sterujące edytora.

## 3. Korzystanie z panelu

**Utwórz nową stronę**: Strony → „+ Nowa strona" → podaj tytuł i adres URL → trafiasz od razu
do edytora modułowego → dodaj moduły (Hero, Obraz + tekst, Galeria, CTA…) → „Opublikuj". Strona
jest dostępna pod `/twoj-adres-url` bez pisania jakiegokolwiek kodu.

**Edytuj stronę główną**: Strony → „Strona główna" (przypięta na górze listy) → ten sam
edytor modułowy co dla każdej innej strony. W modułach można zmienić wszystkie teksty,
przyciski, linki, zdjęcia i ich opisy, komunikaty formularza kontaktowego oraz teksty
kalendarza rezerwacji. Moduły można ukrywać, usuwać, duplikować i zmieniać ich kolejność.

**Edytuj nagłówek, menu, stopkę, kolory i ekran budowy**: Treści globalne → odpowiednia karta →
zmień tekst, adres linku albo sześć kolorów motywu → „Zapisz treści". Pusta etykieta
opcjonalnego elementu ukrywa go na stronie publicznej. Paleta działa na stronie głównej,
podstronach CMS, polityce prywatności i ekranie trybu budowy.

**Tryb budowy / maintenance**: Strony → „Widoczność strony" → „Włącz tryb budowy".
Odwiedzający zobaczą ekran „Zapraszam wkrótce", ale zalogowany administrator nadal może
otworzyć pełną stronę, edytować ją i publikować kolejne wersje. Na tej samej karcie jest
bezpośredni link do edytora strony głównej oraz podgląd ekranu budowy. Zapis w bazie ma
pierwszeństwo przed awaryjną zmienną `SITE_BUILD_MODE`.

**Zmień logo**: Treści globalne → Marka → prześlij nowy plik lub wybierz z biblioteki →
„Zapisz logo". Aktualizuje się automatycznie w nagłówku, stopce i panelu logowania.

**Dodaj zdjęcia do portfolio**: Portfolio / Galeria → „+ Dodaj element" → prześlij zdjęcie
(automatycznie zoptymalizowane) → tytuł/opis/kategoria/tagi → Zapisz. Kolejność zmienisz
strzałkami ↑/↓. Aby pokazać tylko wybrane zdjęcia na danej stronie zamiast całego portfolio,
ustaw to w module Portfolio/Galeria tej strony („Wybór zdjęć: Wybrane ręcznie").

**Zarządzaj mediami**: Obrazy / Media → prześlij, wyszukaj, edytuj opis, usuń. Przy każdym
pliku widać, gdzie jest obecnie używany (strona, element portfolio, logo globalne) —
usunięcie ostrzeże, jeśli plik jest w użyciu.

**Zmień hasło**: Ustawienia → Zmień hasło (nowe hasło musi mieć min. 12 znaków).

**Statystyki i magazyn**: sekcje Statystyki oraz Magazyn pokazują klientów, wizyty,
przychody, najczęstsze style, wartość materiałów i alerty niskiego stanu. Każda korekta
magazynowa trafia do historii ruchów.

**Aplikacja klienta**: konto pod `/app` jest instalowalną PWA. Klient może odzyskać hasło,
śledzić proces, edytować tytuł i opis projektu, dodawać inspiracje, korzystać z czatów
projektowych, instalować aplikację, włączyć powiadomienia push oraz anulować własny przyszły
termin. Kalendarz pokazuje pełną dostępność bez ujawniania godzin zajętych; publiczne
wydarzenie otwiera opis i galerię. Anulowanie natychmiast zwalnia kalendarz, aktualizuje status
projektu i zapisuje informację widoczną dla studia.

Strategia dalszej automatyzacji, asystenta AI, publikacji blog/social i zabezpieczeń znajduje
się w [`docs/ROADMAP_AI_AUTOMATYZACJA_I_ROZWOJ.md`](docs/ROADMAP_AI_AUTOMATYZACJA_I_ROZWOJ.md).

**Odbieraj zapytania z formularza**: wiadomości z publicznego formularza kontaktowego są
zapisywane w bazie i dostępne w panelu: **Wiadomości**. W tym etapie nie są automatycznie
wysyłane e-mailem — integrację z pocztą lub CRM można dodać osobno.

## 4. Wdrożenie produkcyjne

1. **Baza danych**: zmień `provider` w `prisma/schema.prisma` na `"postgresql"` i ustaw
   `DATABASE_URL` na zarządzaną instancję Postgres (Supabase, Neon, Railway, RDS…) — sama
   struktura bazy się nie zmienia. Utwórz migrację lokalnie przez `npx prisma migrate dev`,
   a na hostingu uruchom `npm run db:deploy`; następnie jednorazowo `npm run db:seed`, aby
   utworzyć konto administratora.
2. **Przesyłane pliki**: `/public/uploads` działa lokalnie, ale większość hostingów (np.
   Vercel) ma efemeryczny/tylko-do-odczytu system plików w produkcji. Produkcja używa
   publicznego Vercel Blob podłączonego do projektu przez `BLOB_READ_WRITE_TOKEN`.
   Aplikacja nadal obsługuje również storage zgodny z S3. Gdy skonfigurujesz Cloudflare R2,
   ustaw `S3_ENDPOINT`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
   `S3_BUCKET` i `S3_PUBLIC_URL`; R2 ma pierwszeństwo nad Blob. Kluczy nigdy nie zapisuj w
   repozytorium.
3. **Zmienne środowiskowe**: ustaw `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `MAX_UPLOAD_MB` oraz zmienne `S3_*` w panelu zmiennych/sekretów swojego hostingu (nigdy nie
   commituj `.env`).
4. **Build/start**: standardowo dla Next.js — `npm run build`, potem `npm run start` (lub
   wdrożenie na Vercel / dowolny hosting Node uruchamiający `next build`/`next start`).
5. HTTPS jest wymagane w produkcji, aby flaga `secure` ciasteczka sesji (już warunkowa na
   `NODE_ENV === "production"` w `lib/session.ts`) faktycznie się ustawiła.

## 5. Struktura strony (motyw publiczny)

Nagłówek → domyślne moduły strony głównej: Hero (01) → Pasek statystyk → O mnie (02) → Baner
CTA → Portfolio (03) → Studio (04) → Kontakt (05) → Stopka, plus dowolne strony CMS pod
`/[adres-url]` zbudowane z tych samych modułów.

## 6. Tło kaligraficzne

Oryginalna, mroczna faktura kaligraficzna z sekcji Hero (`/public/images/texture-bg.jpg`)
jest teraz rozprowadzona subtelnie po całej stronie — komponent `CalligraphyBackground`
nakłada ją przy niskiej przezroczystości (4–8%), z inną częścią kadru i pozycją w każdej
sekcji (About, Studio, Portfolio, Kontakt, banery CTA, stopka), żeby wzmacniać nastrój bez
psucia czytelności tekstu. Nigdy nie jest to ten sam kadr przy tej samej sile co w Hero.

## 7. Animacje

- Przyklejony nagłówek (fixed), podświetlający aktualną sekcję podczas przewijania.
- Płynne przewijanie Lenis połączone z tickerem GSAP, napędzające parallax (`ScrollTrigger`)
  na każdym większym zdjęciu.
- Odsłanianie sekcji tekstu/obrazów przy wjeżdżaniu w widok (IntersectionObserver).
- Każdy główny przycisk „wskakuje" przy pierwszym pojawieniu się w widoku.
- Wszystko respektuje `prefers-reduced-motion`.

## 8. Zasoby

- `/public/images` — logo, portret z Hero, faktura kaligraficzna
- `/public/images/crops` — zdjęcia tatuaży/studia wycięte z oryginalnych makiet (domyślne
  zdjęcia portfolio — podmień je w dowolnym momencie przez Portfolio / Galeria)
- `/public/uploads` — wszystko przesłane przez CMS (w `.gitignore`; w produkcji przenieś do
  storage zewnętrznego, patrz punkt 4)

## 9. Rozszerzanie systemu

Nowy typ modułu dodaje się w trzech miejscach: `lib/modules.ts` (typ danych + domyślne
wartości + etykieta PL), nowy komponent w `components/modules/` (styl zgodny z motywem),
`components/ModuleRenderer.tsx` (dopisanie `case` w switchu) oraz pole edycji w
`components/admin/builder/ModuleSettingsSidebar.tsx`. Przykładowe kandydaci na przyszłość:
Usługi (cennik), Opinie klientów (testimonials) — architektura jest gotowa na ich dodanie bez
zmiany czegokolwiek poza tymi czterema miejscami.
