# Backlog Autopilota

Stan na 2026-09-30. Właściciel decyzji: właściciel CoolInk.
P0 = aktywna awaria/utrata danych; P1 = bezpieczeństwo i blokady wydania;
P2 = utrzymanie/UX; P3 = przyszłe pomysły. Priorytet nie określa ryzyka.
Status: TODO, IN_PROGRESS, WAITING_APPROVAL, BLOCKED, DONE.

| ID | Priorytet | Ryzyko | Status | Zadanie / kryterium odbioru |
|---|---|---|---|---|
| AP-001 | P1 | HIGH | BLOCKED | Zweryfikować ochronę main, wyłączność Workera, hosting i gate CI/E2E/security. Audyt: [AP-001_EVIDENCE](AP-001_EVIDENCE.md). Auto-deploy pozostaje wyłączony do czasu browser E2E, potwierdzenia required checks i mutexu Workera. |
| AP-002 | P1 | LOW (odczyt) | TODO | Potwierdzić najnowszy restore drill, kompletność backupu i plan odtworzenia. Run URL, środowisko, data i wynik; brak dowodu blokuje zmiany danych. |
| AP-003 | P1 | LOW (weryfikacja izolowana) | TODO | Zweryfikować regresje po PR #16: RBAC kalendarza, archiwalne rezerwacje, wymagane integration credentials. Dowody testów powiązane z SHA; naprawy auth/danych wymagają HIGH. |
| AP-004 | P2 | LOW | TODO | Uzgodnić README z backup.yml: opis harmonogramu backupu oraz db:push/prisma/dev.db wobec PostgreSQL. |
| AP-005 | P2 | LOW (odczyt) | TODO | Potwierdzić konfigurację i historię Workera oraz kontrolę nakładania uruchomień. |
| AP-006 | P2 | LOW (odczyt) | TODO | Pierwszy pełny audit i market watch do 2026-10-07 według szablonów. |
| AP-007 | P3 | MEDIUM | BLOCKED | AI i publikacja social pozostają odroczone zgodnie z decyzją roadmapy 2026-09-12; wymagają nowej decyzji właściciela. |

Brak potwierdzonego otwartego P0 w tej inspekcji. Nie jest to raport zdrowia produkcji.
Naprawy z PR #14, #15, #16 są na main; nie otwieraj ich ponownie bez reprodukcji.
PR #17 pozostaje otwarty i nie jest zadaniem do automatycznego merge przez Workera.
