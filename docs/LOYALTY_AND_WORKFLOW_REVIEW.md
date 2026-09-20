# Karta lojalnościowa i przegląd obsługi — 20.09.2026

## Aktualizacja: ustawienia i usprawnienia obsługi

- Ustawienia → Program lojalnościowy: próg pieczątki (domyślnie **powyżej 800 zł**), liczba pieczątek (5), rabat (50%), maksymalny rabat (700 zł), domyślna cena sesji (1400 zł). Dokładnie 800 zł nie daje pieczątki. Cenę sesji i limit rabatu edytuje się niezależnie.
- Zmiany ustawień zapisuje właściciel; dziennik zawiera poprzednie i nowe wartości. Zmiana liczby pieczątek zmienia liczbę dostępnych nagród z zachowanego salda. Stare rozliczenia i zwroty zachowują oryginalne kwoty i liczbę pieczątek. Nieaktualny formularz nie może zapisać rozliczenia.
- W projekcie admin podaje zakres sesji i stawkę. Klient widzi szacunek w sesjach; starszych wycen PLN nie konwertujemy. Indywidualne wyceny małych tatuaży nadal są dostępne.
- Karta klienta: „Zakończ i rozlicz wizytę”, opcjonalna kolejna sesja w kolejce działań. Można zakończyć bez płatności — bez pieczątki. Ekran admina pokazuje kolejkę nierozliczonych zakończonych wizyt.
- Anulowanie projektu pod blokadą kalendarza zwalnia wizyty, zamyka jego listę rezerwową, synchronizuje kalendarz i proponuje zwolnione zakresy kolejnym oczekującym.
- Linki z ekranu Start i powiadomień o projektach otwierają konkretny projekt/wizytę. Etapy projektów klienta są uproszczone; status wizyty i zadatku pozostają osobne.
- Kreator ma zapis, wczytanie i usunięcie prywatnego szkicu na koncie oraz ostrzeżenie o niezapisanych zmianach. Szkic zawiera tekst, nie zdjęcia, terminy ani zgody. Zdjęcia trzeba ponownie wybrać, zgody potwierdzić, a termin jest sprawdzany przy wysłaniu.
- Klient zgłasza chęć użycia nagrody przy rezerwacji. Studio widzi prośbę w notatkach i rozliczeniu. Nie rezerwuje to ani nie zużywa pieczątek.

### Weryfikacja i wycofanie

Testy obejmują granicę 800/800,01 zł, zmienne zasady, nieaktualne wyceny rabatu, role, obce konta, powtórzenia, zakończenie bez płatności i szkice. CI dodatkowo sprawdza migracje w wycofywanej transakcji oraz rzeczywiste rozliczenia i izolację danych na bazie testowej.

Migracje są rozszerzające i nie usuwają historii. Przy awarii wstrzymać rozliczenia. Nie cofać aplikacji do wersji zakładającej pięć pieczątek, jeżeli użyto innych ustawień — taka wersja błędnie interpretuje nowe wpisy. Preferować poprawkę do przodu, zachowując wszystkie dane i ustawienia.

Poniżej zachowano wcześniejszą analizę i pierwotne zasady jako kontekst historyczny; aktualne zachowanie opisano powyżej.

## Wdrożenie lojalności

- Admin: karta klienta → „Rozlicz opłaconą wizytę”. Najpierw oznacz wizytę jako zrealizowaną. Podaj cenę po innych rabatach, zaznacz odbiór całej należności (z zadatkiem) i zapisz.
- Klient: karta na ekranie Start, postęp, dostępne nagrody i historia ostatnich 30 operacji.
- Cena > 600 zł: jedna pieczątka za wizytę, niezależnie od projektu. 600 zł nie kwalifikuje się. Konsultacje i zadatki są wyłączone.
- Pięć pieczątek: opcjonalne wykorzystanie 50% rabatu, maksymalnie 700 zł. Wizyta z rabatem nie daje pieczątki. Nagrody można zachować na później.
- Kwoty są zapisane w groszach; rabat zaokrąglany do grosza. Cena 1400 zł jest wstępną wartością formularza, nie narzuconą wyceną.
- Papierowa karta: jednorazowy import 1–5 pieczątek po weryfikacji przez studio. Papierową kartę trzeba fizycznie oznaczyć jako przeniesioną — system sam jej nie zablokuje.
- Wpisy mają autora, datę i powód korekty. Wycofanie rabatu zwraca pięć pieczątek. Nie można wycofać już wykorzystanej pieczątki bez wcześniejszego cofnięcia nagrody.
- Wycofane rozliczenie pozostaje w historii i nie może zostać ponownie naliczone dla tej samej wizyty. Korekta nie wykonuje przelewu ani zwrotu pieniędzy.
- Rozliczenie nie zmienia pola orientacyjnej ceny wizyty; kwota rzeczywiście przyjęta i rabat są widoczne w historii rozliczeń. Nie przelicza historycznych wizyt automatycznie.
- Transakcja i blokada bazy zapobiegają równoległemu wykorzystaniu nagrody; ponowienie tego samego zapisu nie dodaje pieczątki ani powiadomienia.
- Tylko właściciel/manager zarządza rozliczeniami. Klient ma odczyt własnej karty. Tabela jest zamknięta dla bezpośredniego Data API; dane uwzględnione w eksporcie klienta.

## Analiza workflow (na podstawie kodu, bez testu wizualnego)

Istnieje czterostopniowy formularz rezerwacji, wybór istniejącego projektu, wersjonowane zgody, kolejka działań admina, inspiracje i lista rezerwowa. Nie ma potrzeby budować tych mechanizmów od nowa.

| Priorytet | Obserwacja i źródło | Proponowane usprawnienie |
|---|---|---|
| P1 | `components/admin/ProjectManager.tsx`: WYCENA OD/DO (PLN); `components/client/ClientProjectCards.tsx`: cena końcowa projektu. To nie odpowiada wycenie w sesjach. | Osobne pola „szacowane sesje od/do” i „stawka za sesję 1400 zł”. Nie konwertować starych kwot na sesje automatycznie. Małe tatuaże nadal rozliczać indywidualnie. |
| P1 | `app/api/client/projects/[id]/cancel/route.ts` anuluje przyszłe wizyty i synchronizuje Google, ale nie wywołuje `offerReleasedRange`, w przeciwieństwie do anulowania pojedynczej wizyty. | Wspólna transakcyjna ścieżka anulowania, która uruchamia listę rezerwową niezależnie od miejsca anulowania. |
| P1 | Zakończenie wizyty i rozliczenie lojalności są obecnie osobnymi czynnościami. | Jeden formularz „Zakończ i rozlicz”: cena, rabat, płatność, następna sesja. Zachować możliwość zakończenia bez płatności i osobną kolejkę nierozliczonych wizyt. |
| P2 | `ClientProjectCards.tsx` otwiera projekt przez lokalny stan; linki z ekranu Start prowadzą do listy projektów. | Link bezpośrednio do wskazanego projektu/wizyty. Po powiadomieniu klient powinien trafić od razu do właściwego działania. |
| P2 | `lib/projectWorkflow.ts` zawiera 16 statusów projektu, dodatkowo istnieją statusy wizyt i zadatków. | Grupowanie projektu do kilku etapów dla klienta; termin i płatność jako odrębne statusy. Nie usuwać starych wartości bez migracji. |
| P2 | `BookingRequestForm.tsx` przechowuje formularz i inspiracje w stanie komponentu; zamknięcie może oznaczać ponowne wprowadzanie. | Ostrzeżenie przed zamknięciem wypełnionego formularza oraz zapis szkicu na koncie. Nie przechowywać prywatnych zdjęć ani wrażliwych danych w localStorage. |
| P2 | Dostępny rabat pokazuje karta; wykorzystanie potwierdza studio przy rozliczeniu. | Dodać intencję „chcę wykorzystać nagrodę” do rezerwacji, bez zużywania jej do czasu płatności. Studio zobaczy ją przy wizycie. |

Zalecana kolejność: anulowania/lista rezerwowa → wycena w sesjach → jeden formularz zakończenia → linki bezpośrednie i szkice. Powyższe propozycje nie są deklaracją wdrożenia.

## Testy i wydanie

30 nowych testów jednostkowych/HTTP z atrapami sprawdza kwoty, uprawnienia, powtórzenia i korekty. CI zawiera test SQL migracji w tymczasowym schemacie z rollbackiem oraz test rzeczywistych równoległych żądań na izolowanej bazie.

Migracja tworzy nową tabelę bez przekształcania istniejących danych. Wycofanie aplikacji: przywrócić poprzedni commit; pozostawić tabelę i historię rozliczeń, nie usuwać danych. Nie wdrażać, jeśli testy migracji lub naliczania nie przechodzą.
