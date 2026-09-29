# Cotygodniowy audit

## Inspekcja startowa — 2026-09-30

Zakres: kod/dokumenty/workflow na `56fe9a3` i publiczne metadane GitHub.
To nie pełny audit produkcji. Następny pełny audit: do 2026-10-07,
następnie co 7 dni; nadrabiaj zaległy przy pierwszym uruchomieniu Workera.

| Obszar | Potwierdzony stan | Dalsze działanie |
|---|---|---|
| CI/security | Quality and security success dla badanego main, link w RELEASE_LOG | Sprawdzać każde nowe SHA |
| Ochrona main | API branches/main: protected=false; rules/branches/main: pusta lista w inspekcji | AP-001, nie zakładać technicznego wymuszenia polityki |
| E2E | HTTP smoke w workflow; brak osobnej komendy browser E2E w package.json | Potwierdzić pełne scenariusze przed auto-deploy |
| Backup | Codzienny workflow, historyczny sukces w RELEASE_LOG | Sprawdzić świeżość i restore drill |
| Dokumentacja | Rozbieżność harmonogramu backupu i opis prisma/dev.db w README | AP-004 |
| Incydenty/produkcja | Nie badano telemetrii produkcji | Nie deklarować zdrowej produkcji |
| Scheduler i hosting | Niezweryfikowane | AP-001 i AP-005 |

## Procedura i zapis

Co tydzień sprawdź: otwarte P0/P1 i starzenie zadań, CI i flaky tests,
security/dependency alerts, uprawnienia i ochronę main, sekrety (metadane bez
wartości), świeżość/retencję backupu i ostatni restore, błędy i wydajność
produkcji względem baseline, smoke/rollback ostatnich wydań, wygasłe lease,
kompletność ADR i stan prywatności/dostępności krytycznych ścieżek.

Wpis: okres/data UTC, audytor/run, SHA, zakres, źródła/run URL, PASS/FAIL/UNKNOWN
per obszar, wpływ, zadania P0-P3, właściciel i termin, następny audit.
UNKNOWN nie jest PASS; aktywne zagrożenie → INCIDENT, brak dowodu → backlog
i blokada odpowiedniej operacji. Nie naprawiaj produkcji w ramach odczytowego auditu.
