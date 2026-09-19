# Panele studia i klienta

Nowa warstwa wizualna obejmuje `.admin-shell`, `.client-shell` oraz portale `.studio-drawer`. Nie zmienia tokenów publicznej strony ani buildera.

- Tło: `#111316`, powierzchnia: `#1b1e23`, tekst pomocniczy: `#b2b4ba`.
- Złoto: główne działania i aktywna nawigacja. Statusy zachowują semantyczne kolory oraz etykiety tekstowe.
- Promienie: karty 12 px, formularze i przyciski 8 px, wyróżnienie wizyty 18 px.
- Nagłówki treści używają kroju tekstowego; główne tytuły zachowują charakter marki.
- Desktop/tablet od 768 px: sidebar 200 px. Poniżej 768 px: menu admina / dolna nawigacja klienta.
- Admin: plan dnia obok kolejki działań od 1280 px; lista klientów z wyszukiwaniem i podglądem bocznym.
- Klient: najbliższa wizyta jako główny element, następny krok projektu i skróty; większe, leniwie ładowane inspiracje.
- Klawiatura: widoczny fokus, pomijanie nawigacji, zamykanie drawerów Escape, zatrzymanie i przywracanie fokusu.

## Weryfikacja wydania

Lint bez błędów (istniejące ostrzeżenie `no-img-element` dla prywatnych inspiracji), typecheck, 96 testów oraz build przechodzą. Kontrola wizualna nie została wykonana: brak podłączonej przeglądarki.

Bez zmian schematu i migracji. W razie regresji nawigacji lub formularzy wycofać commit tego wydania i ponownie wdrożyć poprzednią wersję; dane pozostają bez zmian.
