# CoolInk — raport audytu i wdrożenia

**Data aktualizacji:** 07.09.2026  
**Zakres:** strona publiczna, panel administratora, konto klienta, rezerwacje, bezpieczeństwo, możliwości redesignu, mobile/PWA, media oraz publiczne otoczenie marki.  
**Stan publikacji:** strona pozostaje w trybie budowy; administrator nadal ma dostęp do pełnego podglądu i edycji.

## 1. Podsumowanie

CoolInk nie jest już wyłącznie stroną-wizytówką. Obecna wersja łączy modułowy CMS, obsługę klientów i projektów, kalendarz, dokumenty, powiadomienia, statystyki, magazyn oraz instalowalne aplikacje klienta i administratora. Najważniejsze bariery wykryte w audycie — niejasna ścieżka rezerwacji, zbyt wiele tekstów zaszytych w kodzie, brak samodzielnego anulowania pojedynczej wizyty, ograniczona swoboda wizualna oraz nietrwałe pliki na Vercel — zostały usunięte. Produkcyjna wersja działa, a publiczny widok nadal pozostaje celowo w trybie budowy.

W kolejnej iteracji wdrożono centrum pracy „Dzisiaj”, globalne wyszukiwanie, konsultacje, samodzielne przełożenie wizyty z zachowaniem 48-godzinnego limitu, listę rezerwową z czasową ofertą terminu, wspólną skrzynkę wiadomości, edytowalne szybkie odpowiedzi oraz przypomnienia push 72 i 24 godziny przed wizytą. Statystyki operacyjne pokazują teraz konwersję zgłoszeń, czas pierwszej odpowiedzi, obłożenie opublikowanych terminów, anulowania, nieobecności, powracających klientów i skuteczność listy rezerwowej.

Najmocniejszy kierunek produktu to **osobista marka artysty + uporządkowana obsługa bez wiadomości rozsianych po DM-ach**. Publiczna strona powinna budować pragnienie i zaufanie, a aplikacja przejmować cały proces od pomysłu do zakończonej sesji.

## 2. Audyt UX

### Strona publiczna

Największym problemem wcześniejszej wersji była przewaga dekoracyjnych komunikatów i efektów nad konkretną ścieżką użytkownika. Usunięto zbędne wezwania w rodzaju „przewiń, żeby odkryć”, a główne działania prowadzą teraz do portfolio, wolnych terminów lub konta klienta. Formularz kontaktowy został zastąpiony publicznym kalendarzem rezerwacji. Wszystkie ważne teksty strony głównej, przyciski, etykiety, zdjęcia, kalendarz, nagłówek i stopka są edytowalne z panelu.

Zalecana hierarchia docelowego redesignu:

1. jedno mocne zdjęcie lub krótki film oraz jasne określenie stylu artysty;
2. wybrane realizacje z filtrem „zagojone / covery / małe / wolne wzory / style”;
3. krótki, osobisty opis procesu i artysty;
4. dowody zaufania: higiena, indywidualny projekt, prawdziwe opinie, zagojone prace;
5. trzy proste kroki rezerwacji;
6. dostępne terminy i jedno główne CTA;
7. FAQ, lokalizacja i kontakt.

### Konto klienta i rezerwacje

Klient ma jeden spójny proces: konto → projekt → termin → decyzja studia → potwierdzenie → dokumenty i przypomnienia. Kalendarz nie ujawnia danych innych osób i nie traktuje samego kliknięcia jako gwarantowanej rezerwacji. Studio nadal zatwierdza zgłoszenie albo proponuje inny termin.

Administrator może oznaczyć dzień jako wolny termin, niedostępny, promocję, wydarzenie albo konsultację. Konsultacja domyślnie zajmuje 09:00–09:30, ma własną niebieską etykietę i pozostaje edytowalna. Klient widzi ją jako osobny rodzaj dostępnego terminu wraz z osobnym tekstem przycisku rezerwacji.

Widok administratora wylicza teraz rzeczywistą pozostałą dostępność zamiast pokazywać surową, pierwotną etykietę „wolny termin”. Po potwierdzeniu wizyty jej czas wraz z buforem jest odejmowany od zakresu. Jeśli nic nie zostało, zielona etykieta znika; przy częściowo zajętym dłuższym bloku widoczna pozostaje tylko faktycznie wolna część.

Dodano samodzielne anulowanie pojedynczej przyszłej wizyty. Klient może anulować wyłącznie własny termin w stanie „zgłoszony”, „zaproponowany” lub „potwierdzony”. Operacja jest powtórnie sprawdzana w transakcji, blokuje wyścig z inną zmianą kalendarza, zwalnia termin, aktualizuje status projektu, zapisuje zdarzenie dla administratora i tworzy potwierdzenie dla klienta. Wizyt zakończonych, już anulowanych, oznaczonych jako nieobecność ani terminów z przeszłości nie można anulować.

### Panel administratora

Panel porządkuje pracę studia wokół kalendarza, klientów, projektów, wiadomości i elementów wymagających uwagi. Ekran „Dzisiaj” łączy nadchodzące wizyty, nowe zgłoszenia, zaległe działania, nieprzeczytane wiadomości i alerty magazynu. Wspólna skrzynka grupuje rozmowy niezależnie od projektu, a odpowiedź tworzy jednocześnie wiadomość w koncie klienta i powiadomienie push. Dostępne są także statystyki operacyjne z filtrem 30/90/365 dni lub całego okresu, magazyn z historią ruchów i alertami, dokumenty, przypomnienia oraz integracja z Kalendarzem Google. Panel administratora można zainstalować jak aplikację; powiadomienia push obejmują m.in. nowe zgłoszenie terminu, anulowanie wizyty lub projektu, odpowiedź klienta, wiadomość i dodanie inspiracji.

Źródło pozyskania jest zapisywane na poziomie każdego zgłoszenia (Instagram, Facebook, Google/Mapy, polecenie, stały klient, wydarzenie lub inne) i może zostać skorygowane przez administratora. Dzięki temu panel pokazuje nie tylko liczbę wejść z kanału, ale również jego konwersję na potwierdzony etap obsługi.

## 3. Wiarygodność i nisza odbiorców

Publiczny profil [CoolInk na Instagramie](https://www.instagram.com/coolink.tattoo.studio/) ma w chwili audytu około 8,7 tys. obserwujących. Bio jasno podaje booking, e-mail, adres i stronę, a zapisane relacje odpowiadają realnym intencjom klienta: „Zagojone”, „Covers”, „Małe tatuaże”, „Wolne wzory” i „Style tatuażu”. Siatka łączy realizacje z obecnością artysty, co jest wartościowe dla marki jednoosobowego studia. Publiczny profil [Patryka na Facebooku](https://www.facebook.com/patryk.kulawiak) wzmacnia połączenie osoby z marką, ale głównym miejscem kampanii i opinii powinna być firmowa strona CoolInk, nie profil prywatny.

Lokalna konkurencja najczęściej komunikuje doświadczenie, liczbę realizacji, higienę, szeroki wybór stylów i bezpośrednią rezerwację. Widać to na stronach [Studio Viking](https://studioviking.pl/), [Valhalla Tattoo](https://valhallatattoo.pl/) oraz w ofertach z opiniami i rezerwacją na [Booksy](https://booksy.com/pl-pl/s/tatuaz/17485_zielona-gora). Przewaga CoolInk nie powinna polegać na kopiowaniu tych samych deklaracji, tylko na połączeniu:

- rozpoznawalnej, osobistej marki i istniejącego zasięgu;
- wyraźnie pokazanych zagojonych prac i coverów;
- transparentnego procesu bez konieczności dopytywania w DM;
- własnego konta klienta, statusów, dokumentów i przypomnień;
- kameralnego doświadczenia 1:1.

Najważniejsza zmiana komunikacyjna: bio i regularne publikacje powinny prowadzić do jednego mierzalnego działania „Sprawdź terminy / zgłoś pomysł”. DM może pozostać kanałem rozmowy, ale nie głównym systemem rezerwacji.

## 4. Możliwości redesignu

Każda strona CMS, łącznie ze stroną główną, korzysta z tego samego edytora typu mini WordPress/Elementor. Lewy, kompaktowy panel zawiera wyszukiwarkę i kafelki widgetów przeciąganych metodą drag-and-drop. Strona składa się z sekcji dzielonych na 1–4 kolumny, a widgety można przenosić pomiędzy kolumnami i ustawiać w wybranej kolejności. Dostępne są gotowe sekcje marki oraz neutralne widgety — nagłówek, tekst, obraz, przycisk, galeria, separator, FAQ, cytat, lista korzyści, komunikat, wideo, mapa i własny HTML + CSS.

Każdy moduł ma wspólne sterowanie:

- kolorem lub obrazem tła, dopasowaniem obrazu i nakładką;
- szerokością treści;
- odstępem wewnętrznym i zewnętrznym;
- wariantem powierzchni: zwykła, karta, obrys lub szkło;
- obramowaniem, promieniem, cieniem, wysokością i przezroczystością;
- widocznością osobno na telefonie, tablecie i komputerze;
- kotwicą, klasą oraz ograniczonymi deklaracjami CSS.

Ustawienia widgetu są podzielone na kompaktowe zakładki „Treść/Układ”, „Styl” i „Zaawansowane”. Obejmują między innymi krój i rozmiar pisma, wagę, interlinię, odstępy liter, wyrównanie, transformację tekstu, kolory, tło, obrys, cień, marginesy, dopełnienie, responsywność i własny CSS.

FAQ ma wariant liniowy, kartowy i dzielony. Lista korzyści działa jako lista, karty albo numerowane kroki w 1–3 kolumnach. Cytaty mają wariant redakcyjny, kartowy i centralny. Własny moduł HTML + CSS jest wyświetlany w odizolowanej ramce bez JavaScriptu, formularzy, dostępu do strony nadrzędnej i połączeń API. Pozwala to tworzyć niestandardowe sekcje bez narażania sesji administratora lub klienta.

Globalna paleta sześciu kolorów jest edytowalna w „Treściach globalnych” i obejmuje stronę główną, wszystkie podstrony, politykę prywatności oraz ekran trybu budowy. Builder zachowuje wersję roboczą oddzielnie od opublikowanej, więc pełny redesign można przygotowywać bez wpływu na klientów.

## 5. Mobile i płynność

Konto klienta i panel administratora są instalowalnymi aplikacjami PWA z własnymi manifestami, ikonami, service workerem i ustawieniami powiadomień. Jeden responsywny produkt jest obecnie właściwszy niż osobna aplikacja natywna: wykorzystuje ten sam backend, działa z linku z Instagrama i nie wymaga instalacji ze sklepu. Osobna aplikacja Android pozostaje świadomie odłożona na później. Builder pozwala kontrolować wygląd osobno dla trzech szerokości i ukrywać moduły zależnie od urządzenia.

Zdjęcia przesyłane przez CMS są automatycznie obracane według EXIF, skalowane maksymalnie do 2400 px i konwertowane do WebP. Next.js generuje AVIF/WebP tam, gdzie korzysta z komponentu optymalizacji obrazu. Animacje respektują `prefers-reduced-motion`. W pełnym redesignie warto utrzymać zasadę: ruch tylko tam, gdzie pomaga hierarchii; bez obowiązkowego „odkrywania” treści przewijaniem.

## 6. Bezpieczeństwo

Wdrożone i zweryfikowane mechanizmy:

- serwerowa autoryzacja administratora i klientów oraz sesje w cookies `HttpOnly`, `Secure` w produkcji i `SameSite=Lax`;
- kontrola własności rekordów: klient może odczytywać i zmieniać wyłącznie własne projekty, wizyty, pliki i profil;
- sprawdzanie pochodzenia wszystkich mutujących wywołań API;
- limity żądań zapisane w bazie dla logowania, rejestracji, odzyskiwania konta, formularzy i anulowania wizyty;
- transakcyjna kontrola kolizji i ponowne sprawdzanie statusu przy anulowaniu;
- CSP, blokada osadzania strony, blokada MIME sniffingu, ograniczona polityka uprawnień i brak indeksowania paneli;
- bezpieczne linki CMS: blokada `javascript:`, `data:` i adresów protokołowo niezależnych;
- mapa ograniczona do poprawnych osadzeń Google, a wideo do YouTube/Vimeo;
- własny HTML/CSS w iframe bez skryptów, formularzy, importów, połączeń i dostępu do nadrzędnej strony;
- walidacja typu i rozmiaru zdjęcia oraz rasteryzacja do WebP;
- sekrety wyłącznie w zmiennych środowiskowych; w plikach śledzonych przez Git nie ma `.env` ani kluczy.

Aktualny `npm audit --omit=dev` nie wykrywa podatności w zależnościach produkcyjnych.

## 7. Magazyn zdjęć

Przesyłanie zdjęć jest uruchomione przez publiczny magazyn Vercel Blob `coolink-media` w
regionie Frankfurt. Projekt otrzymał własny token środowiskowy dla produkcji i preview;
sekret nie jest zapisany w repozytorium. Kod nie próbuje zapisywać do tylko-do-odczytu
katalogu Vercel, gdy Blob albo R2 jest aktywne.

Plan Hobby obejmuje 1 GB storage i 10 GB transferu miesięcznie. Po przekroczeniu limitu Blob
na Hobby zostaje czasowo wstrzymany, zamiast generować opłatę. Cloudflare R2 pozostaje
docelową opcją o większym bezpłatnym limicie. Do jego późniejszego uruchomienia potrzebne są:

1. końcowa aktywacja R2 w Cloudflare;
2. bucket `coolink-media`;
3. publiczna domena plików, preferencyjnie `media.coolinktattoo.pl`;
4. klucz ograniczony do odczytu i zapisu tego jednego bucketu;
5. zaszyfrowane zmienne `S3_*` w Vercel i ponowny deploy. Po ich dodaniu aplikacja
   automatycznie wybierze R2, zachowując dostęp do wcześniej przesłanych adresów Blob.

Cloudflare pokazuje cenę bazową 0 USD/miesiąc, 10 GB storage, 1 mln operacji klasy A i 10 mln operacji klasy B w limicie. Po przekroczeniu limitów nalicza opłaty zgodnie z ekranem zamówienia. Końcowa aktywacja wymaga zaakceptowania regulaminu i zgody na obciążanie metody płatniczej za nadwyżki, dlatego nie została wykonana automatycznie bez osobnego potwierdzenia.

## 8. Weryfikacja techniczna

| Kontrola | Wynik |
|---|---:|
| TypeScript | PASS |
| Testy automatyczne | 57/57 PASS |
| ESLint | 0 błędów, 13 ostrzeżeń nieblokujących |
| Build produkcyjny Next.js | PASS |
| `npm audit --omit=dev` | 0 podatności |
| Sekrety w plikach śledzonych przez Git | nie wykryto |
| Produkcyjne `/`, `/admin/login` i `/app` | HTTP 200 |
| Anulowanie wizyty bez sesji klienta | HTTP 401 |
| Mutujące żądanie z obcej domeny | HTTP 403 |

Testy obejmują m.in. workflow, rzeczywistą dostępność po zajęciu terminu, konsultacje, listę rezerwową, przypomnienia, tryb budowy, linki CMS, ustawienia strony głównej, źródła zgłoszeń, integrację kalendarza, reguły anulowania i bezpiecznego CSS.

Kod został zapisany w głównej gałęzi repozytorium GitHub i poprawnie wdrożony do produkcyjnego
projektu Vercel `cool-ink`. Domena
`www.coolinktattoo.pl` odpowiada z nagłówkami ochronnymi `X-Content-Type-Options: nosniff`
i `X-Frame-Options: DENY`. Tryb budowy nadal jest włączony i oznaczony `noindex`.

## 9. Priorytety po uruchomieniu R2

1. Przesłać reprezentatywny zestaw realizacji: świeże, zagojone, covery, małe tatuaże i wolne wzory.
2. Zbudować nową stronę główną jako draft i przetestować ją na telefonie przed publikacją.
3. Dodać prawdziwe opinie z Google/Facebooka wraz z imieniem i źródłem.
4. Ujednolicić CTA w Instagramie, Facebooku i materiałach promocyjnych do jednego adresu rezerwacji.
5. Po publikacji mierzyć: wejście z social mediów → otwarcie kalendarza → rozpoczęcie zgłoszenia → wysłane zgłoszenie → potwierdzona wizyta.

## 10. Ocena końcowa

Architektura jest gotowa na pełną zmianę wyglądu bez ponownego budowania systemu rezerwacji i danych. Przesyłanie zdjęć działa przez Vercel Blob; aktywacja R2 jest opcjonalną późniejszą migracją zwiększającą bezpłatny limit. Do czasu publikacji redesignu tryb budowy powinien pozostać włączony.
