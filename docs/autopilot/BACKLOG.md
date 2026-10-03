# Backlog Autopilota

Stan na 2026-09-30; baza `56fe9a3`. Właściciel decyzji: właściciel CoolInk.
P0 = aktywna awaria/utrata danych; P1 = bezpieczeństwo i blokady wydania;
P2 = utrzymanie/UX; P3 = przyszłe pomysły. Priorytet nie określa ryzyka.
Status zadania: TODO, IN_PROGRESS, WAITING_APPROVAL, BLOCKED, DONE.

| ID | Priorytet | Ryzyko | Status | Zadanie / kryterium odbioru |
|---|---|---|---|---|
| AP-001 | P1 | HIGH | TODO | Zweryfikować ochronę main, wyłączność Workera, hosting i gate CI/E2E/security. Dowody dla jednego SHA, lista E2E i brak promocji przed checks; zmiany ustawień dopiero po zgodzie. |
| AP-002 | P1 | LOW (odczyt) | TODO | Potwierdzić najnowszy restore drill, kompletność backupu i plan odtworzenia. Run URL, środowisko, data i wynik; brak dowodu blokuje zmiany danych. |
| AP-003 | P1 | LOW (weryfikacja izolowana) | TODO | Zweryfikować regresje po PR #16: RBAC kalendarza, archiwalne rezerwacje, wymagane integration credentials. Dowody testów powiązane z SHA; naprawy auth/danych wymagają HIGH. |
| AP-004 | P2 | LOW | TODO | Uzgodnić README z backup.yml: README mówi o tygodniowym backupie, workflow jest codzienny; poprawić opis db:push/prisma/dev.db wobec PostgreSQL. Odbiór: zgodność ze źródłami bez zmian działania. |
| AP-005 | P2 | LOW (odczyt) | TODO | Potwierdzić konfigurację i historię harmonogramu Worker co 5 h. Dowód uruchomienia, prompt czytający zasady i kontrola nakładania uruchomień. |
| AP-006 | P2 | LOW (odczyt) | TODO | Pierwszy pełny audit i market watch do 2026-10-07 według szablonów. |
| AP-007 | P3 | MEDIUM, ponowna ocena przed realizacją | BLOCKED | AI i publikacja social pozostają odroczone zgodnie z decyzją roadmapy 2026-09-12; wymagają nowej decyzji właściciela. |
| AP-008 | P2 | HIGH (runtime/polityka) | BLOCKED | Kod Autopilota v2 przygotowany na zlecenie właściciela 2026-10-03: router Clef, runner OpenShell, testy i PR. Aktywacja wymaga obrazu z digestem, providera inference, przeglądu efektywnej polityki i live smoke; kryteria oraz rollback w AUTOPILOT_V2.md. Bez merge/promocji w bootstrapie. |

Brak potwierdzonego otwartego P0 w tej inspekcji. Nie jest to raport zdrowia
produkcji. Naprawy z PR #14, #15, #16 są już na main; nie otwieraj ich ponownie
bez reprodukcji. Nowe zadanie musi mieć źródło, zakres, właściciela/run,
branch/PR, zależności, kryterium odbioru, walidację i rollback.
