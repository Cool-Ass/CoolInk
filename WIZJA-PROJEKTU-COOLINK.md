# CoolInk Tattoo Studio — wizja i zarys projektu

> Dokument roboczy opisujący wspólny kierunek projektu. Rozdziela funkcje już wdrożone od elementów zaplanowanych, aby strona i system rozwijały się spójnie.

## 1. Cel projektu

CoolInk to autorska strona internetowa i system obsługi klientów dla jednoosobowego studia tatuażu. Ma łączyć mocny, mroczny charakter marki z bardzo prostym doświadczeniem dla osoby, która po raz pierwszy myśli o tatuażu.

To nie jest tylko strona-wizytówka. Docelowo CoolInk ma być jednym miejscem dla:

- prezentacji stylu, portfolio i studia;
- tworzenia oraz edycji stron bez pomocy programisty;
- przyjmowania i porządkowania zgłoszeń;
- prowadzenia klientów od pomysłu do wizyty;
- zarządzania kalendarzem, dostępnością, promocjami i dokumentami;
- bezpiecznej komunikacji z klientem.

Najważniejsza zasada: **studio komunikuje się w liczbie pojedynczej**. Teksty powinny brzmieć naturalnie, np. „sprawdzę zgłoszenie”, „potwierdzę termin”, „prowadzę studio”, a nie „zespół skontaktuje się z Tobą”.

## 2. Charakter marki i doświadczenie użytkownika

Warstwa wizualna opiera się na czerni, złocie, bieli, wyrazistej typografii display oraz zdjęciach tatuaży. Ma być premium, spokojna i konkretna — bez przeładowania efektami.

Każdy ekran powinien odpowiadać na jedno pytanie:

| Osoba | Co powinna od razu wiedzieć? | Główna akcja |
|---|---|---|
| Odwiedzający | Kim jest artysta i jaki styl tworzy | Obejrzyj portfolio / zgłoś pomysł |
| Nowy klient | Jak zacząć bez znajomości procesu | Wybierz termin lub opisz pomysł |
| Zalogowany klient | Co dzieje się z jego projektem | Sprawdź zgłoszenie / wybierz wizytę |
| Administrator | Co wymaga uwagi dzisiaj | Otwórz kalendarz lub zgłoszenia |

Interfejs ma być samowyjaśniający: czytelne etykiety, puste stany, podpowiedzi przy działaniach nieodwracalnych, widoczny status zapisu i publikacji. Nie budujemy „gotowców strony głównej”, tylko elastyczne, czyste elementy podobne do widgetów Elementora.

## 3. Publiczna strona i CMS

### Założenie

Każda strona, łącznie ze stroną główną, powstaje z modułów w wizualnym builderze. Dzięki temu można zmienić kolejność, treść, zdjęcia, kolory, układ i przyciski bez edycji kodu.

### Stan obecny

- Strona główna oraz podstrony są renderowane z modułów zapisanych w bazie.
- Builder ma tryb roboczy i publikację: zmiany nie trafiają publicznie przed kliknięciem „Opublikuj”.
- W edytorze dostępny jest podgląd desktop/tablet/mobile, dodawanie, duplikowanie, ukrywanie, usuwanie i zmiana kolejności modułów.
- Dostępna jest biblioteka mediów, portfolio, menu i globalne ustawienia marki.
- Moduły mogą używać obrazów oraz ikon SVG/PNG, m.in. przy nagłówkach i separatorach.
- Tryb budowy pozwala wyświetlić odwiedzającym elegancki ekran „Zapraszam wkrótce”, bez odcinania panelu i API potrzebnych do pracy.

### Kierunek rozwoju buildera

Builder ma być rozbudowywany o „puste” widgety, które można swobodnie składać w układy:

- kontenery, sekcje i kolumny;
- nagłówki, teksty, listy, cytaty i separatory;
- przyciski, ikony, obrazy, galerie i wideo;
- karty, siatki, akordeony FAQ, zakładki i wyróżniki;
- formularze CTA, opinie, cennik, godziny otwarcia, mapę i social media;
- widgety dynamiczne: portfolio, dostępne terminy, promocje i przycisk konta klienta.

Każdy widget ma mieć rozsądne ustawienia zamiast ogromnej liczby technicznych opcji. Priorytetem jest szybkie tworzenie spójnych stron.

## 4. Panel administratora

Panel administracyjny jest podzielony na trzy proste obszary:

1. **Panel strony** — strony, builder, portfolio, media, nawigacja, treści globalne.
2. **Wizyty i klienci** — kalendarz, zgłoszenia, klienci, godziny pracy, dni wolne, promocje.
3. **Ustawienia ogólne** — konto administratora, marka, integracje i bezpieczeństwo.

### Główne funkcje administratora

- miesięczny kalendarz oraz widok dnia z godzinami;
- możliwość kliknięcia terminu, utworzenia wizyty dla istniejącego lub nowego klienta, edycji i usunięcia wizyty;
- pełny widok doby dla administratora oraz blokady dni/godzin;
- ustawianie godzin pracy, dni wolnych i promocji z poziomu obsługi wizyt;
- propozycja alternatywnej daty lub godziny w odpowiedzi na zgłoszenie;
- widoczne powiadomienia o najbliższych wizytach i oczekujących zgłoszeniach;
- edycja i usuwanie danych klienta oraz konta klienta;
- dokumenty i zgody z edytorem formatowanego tekstu, wersjonowaniem i potwierdzeniem przez klienta.

## 5. Konto klienta i proces zgłoszenia

### Cel

Klient ma czuć, że jest prowadzony krok po kroku, bez konieczności dzwonienia tylko po to, aby dowiedzieć się, co dalej.

### Stan obecny

- Rejestracja i logowanie e-mailem oraz hasłem.
- Logowanie przez Google; Apple ID pozostaje wyłączone jako możliwa przyszła integracja.
- Po logowaniu Google klient uzupełnia ręcznie dane profilu.
- Klient może edytować swoje dane, dodać zdjęcie profilowe i usunąć własne konto.
- Pulpit klienta od razu pokazuje boczny panel konta, jego zgłoszenia, dokumenty oraz kalendarz wolnych terminów.
- Kalendarz klienta pokazuje godziny pracy co 30 minut. Zajęte terminy są widoczne jako zajęte, bez ujawniania danych innych osób.
- Wolna godzina bez istniejącego projektu prowadzi do zgłoszenia z automatycznie wpisanym wstępnym terminem.
- Formularz zbiera opis pomysłu, styl, miejsce na ciele, rozmiar, kolor, inspiracje oraz preferowany termin.
- Dla istniejącego projektu klient może wysłać propozycję terminu, którą administrator potwierdza później.
- Klient może przeglądać status projektu, wizyty, inspiracje i dokumenty do zaakceptowania.

### Docelowa ścieżka klienta

```text
Portfolio / konto klienta
        ↓
Wybór wolnego terminu (opcjonalnie)
        ↓
Krótki opis tatuażu + dane + inspiracje
        ↓
Zgłoszenie w panelu administratora
        ↓
Akceptacja lub propozycja innego terminu
        ↓
Potwierdzona wizyta + dokumenty + przypomnienia
```

Wstępnie wybrana godzina nie jest automatycznie zablokowaną rezerwacją. Chroni to przed sytuacją, w której wiele osób „zarezerwuje” ten sam termin bez dostarczenia szczegółów. Administrator potwierdza wizytę po analizie zgłoszenia.

## 6. System wizyt, dostępności i promocji

System rozdziela trzy typy informacji:

- **wizyty** — powiązane z konkretnym projektem i klientem;
- **dostępność** — powtarzalne godziny pracy oraz jednorazowe dni/godziny wolne;
- **promocje** — komunikaty i oferty przypisane do pojedynczego dnia lub zakresu dat.

To pozwala bezpiecznie wyświetlić klientowi tylko to, co powinien widzieć: wolny termin, zajęty termin lub promocję — nigdy dane innego klienta.

## 7. Dane i integracje

| Obszar | Technologia / rola |
|---|---|
| Aplikacja | Next.js, React, TypeScript, Tailwind CSS |
| Dane aplikacji | PostgreSQL w Supabase, obsługiwany przez Prisma |
| Uwierzytelnianie klientów | Supabase Auth: e-mail/hasło i Google OAuth |
| Panel administratora | Własna sesja administratora oparta na bezpiecznym cookie |
| Hosting | Vercel |
| Repozytorium | GitHub: `Cool-Ass/CoolInk` |
| Domeny | `coolinktattoo.pl` oraz `www.coolinktattoo.pl` |

Sekrety, adresy połączeń do bazy i klucze OAuth są przechowywane wyłącznie w zmiennych środowiskowych. Nigdy nie trafiają do repozytorium ani do kodu wysyłanego do przeglądarki.

## 8. Bezpieczeństwo i prywatność

Bezpieczeństwo jest elementem produktu, ponieważ system przechowuje dane kontaktowe, opisy projektów i dokumenty klientów.

### Wdrożone zabezpieczenia

- sesje HTTP-only, `Secure` w produkcji i `SameSite=Lax`;
- autoryzacja administratora i klientów po stronie serwera;
- kontrola uprawnień: klient widzi i zmienia wyłącznie własne dane, projekty i pliki;
- zabezpieczony przepływ Google OAuth z PKCE;
- ograniczenia rejestracji, logowania, formularza kontaktowego, zgłoszeń i propozycji wizyt;
- ukryte pola antybotowe w formularzach;
- walidacja danych i limity długości tekstu po stronie serwera;
- blokada żądań API pochodzących z obcej domeny;
- limity rozmiaru żądań do API;
- nagłówki ochronne: CSP, blokada ramek, blokada nieprawidłowych typów MIME, restrykcyjna polityka uprawnień;
- usuwanie konta klienta wraz z powiązanymi danymi zgodnie z relacjami w bazie.

### Kolejny ważny krok produkcyjny

Limity aplikacji działają na instancjach aplikacji. Dla pełnej ochrony przed większym ruchem automatycznym należy dodatkowo włączyć ochronę botów/rate limiting po stronie Vercel lub zewnętrznego firewalla. Warto również przygotować regulamin, politykę prywatności i jasną informację o przetwarzaniu danych.

## 9. Priorytety dalszego rozwoju

### Najbliższy etap

1. Dopracować wszystkie widoki kalendarza administratora i klienta na desktopie oraz mobile.
2. Domknąć przepływ propozycji alternatywnego terminu i powiadomień w panelu.
3. Rozbudować builder o kolejne neutralne widgety oraz gotowe układy bazowe.
4. Dodać dokumenty prawne: prywatność, cookies, regulamin konta klienta i zgody.
5. Skonfigurować zewnętrzną ochronę ruchu na hostingu.

### Kolejne etapy

- powiadomienia e-mail o zgłoszeniu, zmianie statusu i zbliżającej się wizycie;
- depozyty i status płatności;
- wiadomości w obrębie projektu;
- bardziej zaawansowana galeria inspiracji oraz komentarze do projektu;
- analityka zgłoszeń i konwersji strony;
- opcjonalne Apple ID po gotowej konfiguracji Apple Developer;
- wersja PWA / wygodne powiadomienia mobilne.

## 10. Definicja sukcesu

Projekt jest udany, gdy:

- właściciel może samodzielnie zmienić stronę główną i podstrony w builderze;
- klient w mniej niż kilka minut wyśle kompletny pomysł i wskaże wygodny termin;
- kalendarz nie dopuszcza kolizji i nie ujawnia danych innych osób;
- wszystkie sprawy klienta są w jednym miejscu: projekt, wizyty, dokumenty i inspiracje;
- administrator zaczyna dzień od jasnej listy tego, co wymaga działania;
- strona pozostaje szybka, bezpieczna i spójna wizualnie z marką CoolInk.
