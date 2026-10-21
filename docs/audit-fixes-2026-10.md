# Poprawki po audycie CoolInk — 20.10.2026

Zmiany przygotowano na bazie `aeb236d` na gałęzi `fix/audit-2026-10`. Status „w kodzie” oznacza implementację i weryfikację lokalną, a nie potwierdzenie wdrożenia na produkcji.

## Zakres

| Ustalenie | Zmiana |
| --- | --- |
| SEC-01 | Publiczny błąd zajętego terminu nie zawiera nazwy obcego projektu ani powodu blokady kalendarza. |
| SEC-02 | Setup i enable odrzucają aktywne MFA. Warunkowe zapisy sprawdzają aktualny klucz, stan i wersję sesji, zapobiegając nadpisaniu równoległej konfiguracji. |
| SEC-03 | Po aktywacji MFA kody awaryjne pozostają na ekranie do świadomego przejścia do logowania. Sesje są unieważniane od razu; odpowiedź z kodami nie jest cache'owana. |
| SEC-04 | Wszystkie role mogą zarządzać MFA i hasłem własnego konta. Stan systemu i globalny dziennik pozostają dostępne tylko z uprawnieniem właściciela. |
| MSG-01 | Cztery endpointy rozmów pobierają najnowszą stronę 50 wpisów, z dodatkowym rekordem do wykrycia starszej historii. Kursor oparty na dacie i ID pozwala przewijać całą historię. Polling nie nadpisuje wyników wysyłki/usuwania rozpoczętych później; dłuższa przerwa nie tworzy niewidocznej luki w historii. |
| MSG-02 | Zalogowany klient może rozpocząć rozmowę ogólną bez projektu i bez pierwszej wiadomości administratora. Zachowano autoryzację, limit żądań i ochronę origin. |
| FIN-01 | Publiczny opis lojalności powstaje z faktycznych reguł: jedna kwalifikująca się wizyta, ścisły próg, limit rabatu i wyłączenie nagrody/zadatku. Dowolny stary tekst nie może go zastąpić. Edycja parametrów programu nadal działa; historia finansowa nie jest zmieniana. |
| UX-01–02 | Etapy „Zgłoszenie” i „Potwierdzenie” mają odrębne znaczenie; anulowane i nieodbyte wizyty nie pokazują aktywnego postępu. Tekst dopuszcza zaproponowanie innego terminu przez studio. |
| UX-03–04 | Doprecyzowano CTA po zgłoszeniu i dodano jawny powrót ze szczegółów wizyty do projektu. Zamknięcie briefu wraca do wybranego dnia kalendarza. Pełne ujednolicenie terminologii wszystkich ekranów pozostaje osobnym przeglądem copy. |
| CAL-01–02 | Mobilny kalendarz otrzymał czytelną listę dostępnych dni i godzin. Przed briefem wyjaśnia, że to okno dostępności, a dokładny czas i cenę potwierdza studio. |
| CAL-03 | Lista rezerwowa ma domyślną opcję „Nie wiem — czas ustali studio”. Nieznany czas wymaga ręcznej decyzji przed ofertą; nie uruchamia dopasowania automatycznego. |
| FORM-01 / A11Y-03 | Opis briefu ma lokalny komunikat błędu, powiązanie aria-describedby, aria-invalid i przeniesienie fokusu. Akcje formularza pozostają widoczne podczas przewijania. |
| DOC-01 | Karta dokumentu pokazuje datę potwierdzenia i kontekst sesji; archiwum także wersję. Panel sesji bez opublikowanych zgód nie pokazuje QR prowadzącego do pustego formularza. |
| CARE-01 | Pusta pielęgnacja wyjaśnia, kiedy pojawią się materiały, zamiast przekierowywać bez wyjaśnienia. |
| A11Y-01–02–04 | aria-current w nawigacji klienta; większe etykiety w nawigacji, czacie i dokumentach; większe wspólne przyciski i akcje ikonowe; czytelna nazwa usuwania pliku. Nie jest to deklaracja pełnej zgodności WCAG. |
| CMS-01–02 | Audyt edytora ostrzega o typowych tekstach szablonu i brakujących lokalnych kotwicach. Panel na telefonie jest domyślnie schowany i otwiera się nad podglądem, zamiast ściskać go do wąskiego paska. |
| ADM-01 | Mobilny pulpit pokazuje do trzech pilnych decyzji przed długimi sekcjami oraz sygnalizuje przekroczony termin działania. Nie dodawano modelu właścicieli zadań. |
| ADM-03 | Link stanu systemu wybiera kategorię bezpieczeństwa i otwiera właściwą sekcję. |
| Dodatkowe | Powiadomienia rozróżniają brak zapytań od obecnych próśb o wizytę. Statystyki pokazują „Brak ofert” przy zerowym mianowniku listy rezerwowej. Poprawiono etykiety liczników kalendarza. |

## Weryfikacja

- Pełny zestaw Vitest: **120 plików, 713 testów — poprawnie**.
- `npm run typecheck`: poprawnie; także kontrola TypeScript podczas końcowej kompilacji.
- `npm run build`: poprawnie.
- `npm run lint`: wynik zapisany w przekazaniu zmian; pozostające ostrzeżenia dotyczą użycia obrazów.
- Testy regresyjne obejmują MFA, prywatność konfliktów rezerwacji, 205 wiadomości i identyczne znaczniki czasu, autoryzację czterech endpointów rozmów, inicjowanie kontaktu, stany wizyt, wykrywanie tekstów szablonowych i nieznany czas sesji.
- Testy endpointów używają atrap zależności. Nie zastępują testów współbieżności na PostgreSQL ani testów interfejsu w rzeczywistej przeglądarce.
- Nie uruchomiono pełnego zestawu E2E: brak `.env.dryrun.local` i dostępu do skonfigurowanej, izolowanej bazy testowej. Nie zastępowano jej produkcją.

## Uwagi wdrożeniowe

Nie zmieniono schematu bazy. W istniejącym polu `WaitlistEntry.durationMinutes` wartość **0** oznacza „do oszacowania przez studio”, a nie wizytę o zerowej długości. Backend ofert nadal wymaga 30–720 minut. Automatyczne oferty pomijają takie wpisy już w zapytaniu; ręczna oferta zapisuje czas ustalony przez administratora. Przy ewentualnym wycofaniu tej wersji należy najpierw obsłużyć wpisy z wartością 0 — stara wersja nie zna tej semantyki.

Wcześniejszy własny opis lojalności pozostaje w ustawieniach do następnego zapisu, ale nie zastępuje reguł na karcie klienta. Zapis ustawień utrwala opis standardowy. Nie przeliczano historycznych pieczątek, nagród ani płatności.

## Nadal do wykonania na środowisku testowym / wdrożeniu

1. Przejść MFA jako właściciel, manager, artysta i recepcja: setup, odbiór kodów, ponowne logowanie, kod awaryjny, regeneracja, wyłączenie i równoległe żądania.
2. Sprawdzić rozmowę 205+ wpisów na desktop/mobile: wysłanie, powrót po dłuższej przerwie, starsza historia, zdjęcia, ukrycie oraz przewijanie bez skoków.
3. Sprawdzić 390 px, 768 px i 1440 px oraz klawiaturę dla kalendarza, briefu, dokumentów, panelu edytora i powiększonych przycisków.
4. Sprawdzić ręczną ofertę dla nieznanego czasu sesji, jej akceptację, wygaśnięcie i ponowne dopasowanie.
5. Opublikować rzeczywiste, zatwierdzone treści zgód i uzupełnić teksty CMS/portfolio. Ostrzeżenia edytora nie zastępują redakcji treści.
6. Zweryfikować backup przez próbę odtworzenia oraz rzeczywiste dostarczenie powiadomień i rozliczenia na izolowanych danych. Kod nie jest dowodem sprawności konfiguracji produkcyjnej.

Nie wykonano wdrożenia ani zmian w danych produkcyjnych. Raport PDF z 15.10.2026 pozostaje zapisem stanu sprzed poprawek.


## Uzupełnienie przed wdrożeniem — 21.10.2026

- Pełne testy integracyjne uruchomiono w GitHub Actions na izolowanej bazie. Wcześniejsza uwaga o braku dostępu dotyczyła środowiska lokalnego, nie dostępności CI.
- Naprawiono przejście po logowaniu klienta i administratora: nowy dokument korzysta z aktualnych ciasteczek sesji. Test ponownego logowania klienta przeszedł w przebiegu 270.
- Dodano przeglądarkowe scenariusze aktywacji MFA przez artystę, odbioru kodów, unieważnienia starej sesji i logowania kodem awaryjnym oraz historii 205 wiadomości z identycznymi datami.
- Kod awaryjny MFA jest zużywany atomowo. Przegrane równoległe żądanie nie dostaje nowej sesji i nie przywraca zużytych kodów.
- Test interfejsu mobilnego edytora otwiera i zamyka panel narzędzi przed interakcją z podglądem.
- Odczyt DNS 21.10.2026 potwierdził NXDOMAIN dla domeny coolinktattoo.pl; Vercel wskazał Invalid Configuration. To osobny problem od kodu aplikacji.
- Monitoring odzyskiwania, eksport Google i kopia konfiguracji korzystają ze zweryfikowanego produkcyjnego adresu cool-ink.vercel.app, aby awaria własnej domeny nie zatrzymywała zadań. Odbiorcy tokenów OIDC, kontrola repozytorium, gałęzi, workflow i ochrona przed ponowieniem pozostają bez zmian. Kopia konfiguracji wymaga zgodności rewizji wdrożenia z main.
- Pełna zaszyfrowana kopia produkcji: https://github.com/Cool-Ass/CoolInk/actions/runs/39570628651 — success. Pierwsza próba przez własną domenę zakończyła się błędem; udana próba użyła zweryfikowanego adresu aktualnego wdrożenia. Odtworzenie tej kopii uruchomiono osobno w izolacji: https://github.com/Cool-Ass/CoolInk/actions/runs/39570934447 .

Końcowy wynik CI, rewizja produkcyjna i wynik weryfikacji po publikacji wymagają potwierdzenia po zakończeniu bieżącego wdrożenia. Nie publikowano niezatwierdzonych treści zgód ani danych fikcyjnych jako treści studia.
