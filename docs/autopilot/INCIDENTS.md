# Incydenty

## Stan startowy — 2026-09-30

Brak nowego potwierdzonego aktywnego incydentu w zakresie inspekcji repo.
Nie sprawdzano telemetrii produkcji. Historyczne poprawki PR #14–#16 są
na main (RELEASE_LOG); sam tytuł poprawki nie dowodzi aktywnej awarii.

## Reakcja

1. Potwierdź objaw i środowisko; zapisz INC-ID, czas UTC, źródło, wpływ,
   dotknięte SHA/deployment i status INCIDENT. Zatrzymaj kolejne promocje.
2. Oceń priorytet: P0 dla aktywnej utraty danych, naruszenia dostępu lub
   niedostępności krytycznej usługi; P1 dla istotnej degradacji bez tych objawów.
3. Zabezpiecz zredagowane dowody; powiadom właściciela dostępnym uzgodnionym
   kanałem. Nie ujawniaj danych klientów ani sekretów w publicznym issue.
4. Ogranicz skutki zgodnie z zatwierdzonym planem. Rollback kodu tylko gdy
   znana jest poprzednia dobra wersja i zgodność ze schematem. Operacje HIGH
   wymagają zgody także w incydencie. Restore danych wymaga backup gate
   i zgody na utratę późniejszych zapisów; nie wykonuj automatycznego restore.
5. Po naprawie/rollbacku wykonaj smoke i obserwację według runbooka; dopiero
   wtedy zamknij incydent. Wpisz release/rollback, przyczynę i zadania zapobiegawcze.

## Szablon wpisu

ID; status OPEN/MITIGATED/RESOLVED; priorytet; właściciel; początek/wykrycie/
zakończenie UTC; objawy i zakres; dowody; oś czasu; zgody; działania i ich SHA;
backup/rollback; wynik smoke; przyczyna (UNKNOWN do potwierdzenia); zadania
z terminami; link do RELEASE_LOG. Przegląd przyczyny do dwóch dni roboczych
od zamknięcia. Nie usuwaj historycznych wpisów.
